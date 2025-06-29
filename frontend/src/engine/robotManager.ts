// backend/src/engine/RobotManager.ts

import { Pool } from 'pg';
import { EngineLogger } from './logger';
import { RobotState, EngineEventData } from './types';

export class RobotManager {
  private simulationId: number;
  private pool: Pool;
  private logger: EngineLogger;
  private robots: Map<number, RobotState> = new Map();
  private onRobotUpdateCallback?: (robotId: number, robotState: RobotState) => void;

  constructor(simulationId: number, pool: Pool, logger: EngineLogger) {
    this.simulationId = simulationId;
    this.pool = pool;
    this.logger = logger;
  }

  public setRobotUpdateCallback(callback: (robotId: number, robotState: RobotState) => void): void {
    this.onRobotUpdateCallback = callback;
  }

  public async loadRobots(): Promise<void> {
    try {
      const query = `
        SELECT id, simulation_id, name, version, x_position, y_position, 
               direction, battery_level, status, color, created_at, updated_at
        FROM robots 
        WHERE simulation_id = $1
      `;
      
      const result = await this.pool.query(query, [this.simulationId]);
      
      this.robots.clear();
      
      for (const row of result.rows) {
        const robotState: RobotState = {
          id: row.id,
          x_position: row.x_position,
          y_position: row.y_position,
          direction: row.direction,
          battery_level: row.battery_level,
          status: row.status,
          current_task_id: null,
          target_x: undefined,
          target_y: undefined,
          path: undefined,
          last_updated: new Date()
        };
        
        this.robots.set(row.id, robotState);
      }
      
      this.logger.info('Robots loaded', { 
        count: this.robots.size,
        robotIds: Array.from(this.robots.keys())
      });
      
    } catch (error) {
      this.logger.error('Failed to load robots', { error });
      throw error;
    }
  }

  public async resetRobots(): Promise<void> {
    try {
      // Get base station coordinates
      const simQuery = `
        SELECT base_station_x, base_station_y 
        FROM simulations 
        WHERE id = $1
      `;
      const simResult = await this.pool.query(simQuery, [this.simulationId]);
      
      const baseX = simResult.rows[0]?.base_station_x || 0;
      const baseY = simResult.rows[0]?.base_station_y || 0;
      
      // Reset all robots to base station
      const resetQuery = `
        UPDATE robots 
        SET x_position = $1, 
            y_position = $2, 
            status = 'idle',
            battery_level = CASE 
              WHEN version = 'V1' THEN 100
              WHEN version = 'V2' THEN 150
              WHEN version = 'V3' THEN 200
              ELSE 100
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE simulation_id = $3
        RETURNING id, x_position, y_position, battery_level, status
      `;
      
      const result = await this.pool.query(resetQuery, [baseX, baseY, this.simulationId]);
      
      // Update internal state
      for (const row of result.rows) {
        const robot = this.robots.get(row.id);
        if (robot) {
          robot.x_position = row.x_position;
          robot.y_position = row.y_position;
          robot.battery_level = row.battery_level;
          robot.status = row.status;
          robot.current_task_id = null;
          robot.target_x = undefined;
          robot.target_y = undefined;
          robot.path = undefined;
          robot.last_updated = new Date();
        }
      }
      
      this.logger.info('Robots reset to base station', { 
        baseX, 
        baseY, 
        resetCount: result.rowCount 
      });
      
    } catch (error) {
      this.logger.error('Failed to reset robots', { error });
      throw error;
    }
  }

  public getRobots(): Map<number, RobotState> {
    return new Map(this.robots);
  }

  public getRobot(robotId: number): RobotState | undefined {
    return this.robots.get(robotId);
  }

  public getAvailableRobots(): RobotState[] {
    return Array.from(this.robots.values()).filter(robot => 
      robot.status === 'idle' && robot.battery_level > 20
    );
  }

  public getBusyRobots(): RobotState[] {
    return Array.from(this.robots.values()).filter(robot => 
      robot.status === 'moving' || robot.status === 'working'
    );
  }

  public getChargingRobots(): RobotState[] {
    return Array.from(this.robots.values()).filter(robot => 
      robot.status === 'charging'
    );
  }

  public getLowBatteryRobots(): RobotState[] {
    return Array.from(this.robots.values()).filter(robot => 
      robot.battery_level <= 20 && robot.status !== 'charging'
    );
  }

  public async updateRobotPosition(robotId: number, x: number, y: number, direction?: string): Promise<void> {
    const robot = this.robots.get(robotId);
    if (!robot) {
      this.logger.warn('Attempted to update position of non-existent robot', { robotId });
      return;
    }

    const oldPosition = { x: robot.x_position, y: robot.y_position };
    
    robot.x_position = x;
    robot.y_position = y;
    if (direction) {
      robot.direction = direction;
    }
    robot.last_updated = new Date();

    // Update database
    try {
      await this.pool.query(
        `UPDATE robots SET x_position = $1, y_position = $2, direction = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [x, y, robot.direction, robotId]
      );

      this.logger.debug('Robot position updated', { 
        robotId, 
        oldPosition, 
        newPosition: { x, y },
        direction: robot.direction
      });

      // Notify callback
      if (this.onRobotUpdateCallback) {
        this.onRobotUpdateCallback(robotId, robot);
      }

    } catch (error) {
      this.logger.error('Failed to update robot position in database', { 
        robotId, 
        x, 
        y, 
        error 
      });
    }
  }

  public async updateRobotStatus(robotId: number, status: string): Promise<void> {
    const robot = this.robots.get(robotId);
    if (!robot) {
      this.logger.warn('Attempted to update status of non-existent robot', { robotId });
      return;
    }

    const oldStatus = robot.status;
    robot.status = status;
    robot.last_updated = new Date();

    // Update database
    try {
      await this.pool.query(
        `UPDATE robots SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, robotId]
      );

      this.logger.debug('Robot status updated', { 
        robotId, 
        oldStatus, 
        newStatus: status 
      });

      // Notify callback
      if (this.onRobotUpdateCallback) {
        this.onRobotUpdateCallback(robotId, robot);
      }

    } catch (error) {
      this.logger.error('Failed to update robot status in database', { 
        robotId, 
        status, 
        error 
      });
    }
  }

  public async updateRobotBattery(robotId: number, batteryLevel: number): Promise<void> {
    const robot = this.robots.get(robotId);
    if (!robot) {
      this.logger.warn('Attempted to update battery of non-existent robot', { robotId });
      return;
    }

    const oldBattery = robot.battery_level;
    robot.battery_level = Math.max(0, Math.min(200, batteryLevel)); // Clamp between 0-200
    robot.last_updated = new Date();

    // Update database
    try {
      await this.pool.query(
        `UPDATE robots SET battery_level = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [robot.battery_level, robotId]
      );

      this.logger.debug('Robot battery updated', { 
        robotId, 
        oldBattery, 
        newBattery: robot.battery_level 
      });

      // Notify callback
      if (this.onRobotUpdateCallback) {
        this.onRobotUpdateCallback(robotId, robot);
      }

    } catch (error) {
      this.logger.error('Failed to update robot battery in database', { 
        robotId, 
        batteryLevel, 
        error 
      });
    }
  }

  public setRobotTask(robotId: number, taskId: number | null, targetX?: number, targetY?: number): void {
    const robot = this.robots.get(robotId);
    if (!robot) {
      this.logger.warn('Attempted to set task for non-existent robot', { robotId });
      return;
    }

    robot.current_task_id = taskId;
    robot.target_x = targetX;
    robot.target_y = targetY;
    robot.path = undefined; // Clear existing path
    robot.last_updated = new Date();

    this.logger.debug('Robot task assignment updated', { 
      robotId, 
      taskId, 
      target: targetX !== undefined && targetY !== undefined ? { x: targetX, y: targetY } : null
    });
  }

  public setRobotPath(robotId: number, path: Array<{ x: number; y: number }>): void {
    const robot = this.robots.get(robotId);
    if (!robot) {
      this.logger.warn('Attempted to set path for non-existent robot', { robotId });
      return;
    }

    robot.path = [...path];
    robot.last_updated = new Date();

    this.logger.debug('Robot path updated', { 
      robotId, 
      pathLength: path.length,
      destination: path.length > 0 ? path[path.length - 1] : null
    });
  }

  public getRobotStatistics(): {
    total: number;
    idle: number;
    moving: number;
    working: number;
    charging: number;
    lowBattery: number;
    averageBattery: number;
  } {
    const robots = Array.from(this.robots.values());
    
    return {
      total: robots.length,
      idle: robots.filter(r => r.status === 'idle').length,
      moving: robots.filter(r => r.status === 'moving').length,
      working: robots.filter(r => r.status === 'working').length,
      charging: robots.filter(r => r.status === 'charging').length,
      lowBattery: robots.filter(r => r.battery_level <= 20).length,
      averageBattery: robots.length > 0 ? 
        robots.reduce((sum, r) => sum + r.battery_level, 0) / robots.length : 0
    };
  }

  public clear(): void {
    this.robots.clear();
    this.logger.debug('Robot manager cleared');
  }
}