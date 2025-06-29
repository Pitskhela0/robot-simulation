// backend/src/engine/SimulationEngine.ts

import { Pool } from 'pg';
import { EngineLogger } from './logger';
import {
  SimulationState,
  SimulationConfig,
  RobotState,
  TaskState,
  SimulationSnapshot,
  EngineEventData,
  EngineEventHandler
} from './types';

export class SimulationEngine {
  private simulationId: number;
  private config: SimulationConfig;
  private logger: EngineLogger;
  private pool: Pool;
  
  private state: SimulationState = SimulationState.STOPPED;
  private robots: Map<number, RobotState> = new Map();
  private tasks: Map<number, TaskState> = new Map();
  
  private gameLoop: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private elapsedTime = 0;
  private lastUpdate: Date = new Date();
  
  private eventHandlers: EngineEventHandler[] = [];
  
  constructor(simulationId: number, pool: Pool, config?: Partial<SimulationConfig>) {
    this.simulationId = simulationId;
    this.pool = pool;
    
    // Default configuration
    this.config = {
      updateInterval: 500,
      maxRobots: 50,
      enableLogging: true,
      batteryDrainEnabled: true,
      taskAllocationEnabled: true,
      ...config
    };
    
    this.logger = new EngineLogger(simulationId, this.config.enableLogging);
    
    this.logger.info('SimulationEngine initialized', {
      simulationId: this.simulationId,
      config: this.config
    });
  }

  // Public API Methods
  public getSimulationId(): number {
    return this.simulationId;
  }

  public getState(): SimulationState {
    return this.state;
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('Configuration updated', {
      oldConfig,
      newConfig: this.config
    });

    // Update logger if logging setting changed
    if (newConfig.enableLogging !== undefined) {
      this.logger.setEnabled(newConfig.enableLogging);
    }

    // Restart game loop if interval changed and engine is running
    if (newConfig.updateInterval && this.state === SimulationState.RUNNING) {
      this.restartGameLoop();
    }
  }

  public addEventListener(handler: EngineEventHandler): void {
    this.eventHandlers.push(handler);
  }

  public removeEventListener(handler: EngineEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  // State Management Methods
  public async start(): Promise<void> {
    if (this.state === SimulationState.RUNNING) {
      this.logger.warn('Attempted to start already running simulation');
      return;
    }

    try {
      await this.loadSimulationData();
      
      this.state = SimulationState.RUNNING;
      this.startTime = new Date();
      this.lastUpdate = new Date();
      
      this.startGameLoop();
      
      this.logger.info('Simulation started');
      this.emitEvent('simulation_state_changed', { 
        newState: this.state,
        startTime: this.startTime 
      });
      
    } catch (error) {
      this.logger.error('Failed to start simulation', { error });
      this.state = SimulationState.STOPPED;
      throw error;
    }
  }

  public async pause(): Promise<void> {
    if (this.state !== SimulationState.RUNNING) {
      this.logger.warn('Attempted to pause non-running simulation', { currentState: this.state });
      return;
    }

    this.state = SimulationState.PAUSED;
    this.stopGameLoop();
    
    this.logger.info('Simulation paused');
    this.emitEvent('simulation_state_changed', { 
      newState: this.state,
      elapsedTime: this.elapsedTime 
    });
  }

  public async resume(): Promise<void> {
    if (this.state !== SimulationState.PAUSED) {
      this.logger.warn('Attempted to resume non-paused simulation', { currentState: this.state });
      return;
    }

    this.state = SimulationState.RUNNING;
    this.lastUpdate = new Date();
    this.startGameLoop();
    
    this.logger.info('Simulation resumed');
    this.emitEvent('simulation_state_changed', { 
      newState: this.state 
    });
  }

  public async stop(): Promise<void> {
    if (this.state === SimulationState.STOPPED) {
      this.logger.warn('Attempted to stop already stopped simulation');
      return;
    }

    this.state = SimulationState.STOPPED;
    this.stopGameLoop();
    
    this.logger.info('Simulation stopped', { 
      elapsedTime: this.elapsedTime,
      totalRobots: this.robots.size,
      totalTasks: this.tasks.size
    });
    
    this.emitEvent('simulation_state_changed', { 
      newState: this.state,
      elapsedTime: this.elapsedTime 
    });
  }

  public async reset(): Promise<void> {
    await this.stop();
    
    // Reset internal state
    this.robots.clear();
    this.tasks.clear();
    this.elapsedTime = 0;
    this.startTime = null;
    this.lastUpdate = new Date();
    
    // Reset simulation in database
    await this.resetSimulationData();
    
    this.logger.info('Simulation reset');
    this.emitEvent('simulation_state_changed', { 
      newState: this.state,
      reset: true 
    });
  }

  // Game Loop Methods
  private startGameLoop(): void {
    if (this.gameLoop) {
      this.stopGameLoop();
    }

    this.gameLoop = setInterval(() => {
      this.update();
    }, this.config.updateInterval);

    this.logger.debug('Game loop started', { interval: this.config.updateInterval });
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
      this.logger.debug('Game loop stopped');
    }
  }

  private restartGameLoop(): void {
    this.logger.debug('Restarting game loop with new interval', { interval: this.config.updateInterval });
    this.stopGameLoop();
    if (this.state === SimulationState.RUNNING) {
      this.startGameLoop();
    }
  }

  // Core Update Logic (basic implementation for Part 2)
  private async update(): Promise<void> {
    try {
      const now = new Date();
      const deltaTime = now.getTime() - this.lastUpdate.getTime();
      
      this.elapsedTime += deltaTime;
      this.lastUpdate = now;

      // TODO: Implement actual update logic in subsequent parts
      // - Update robot positions
      // - Process task assignments
      // - Handle battery drain
      // - Check task completions
      
      this.logger.debug('Update cycle completed', { 
        deltaTime,
        elapsedTime: this.elapsedTime,
        robotCount: this.robots.size,
        taskCount: this.tasks.size
      });
      
    } catch (error) {
      this.logger.error('Error in update loop', { error });
      await this.stop();
    }
  }

  // Data Loading Methods (to be implemented in subsequent parts)
  private async loadSimulationData(): Promise<void> {
    this.logger.info('Loading simulation data...');
    
    // TODO: Load robots and tasks from database
    // This will be implemented in subsequent parts
    
    this.logger.info('Simulation data loaded', {
      robotCount: this.robots.size,
      taskCount: this.tasks.size
    });
  }

  private async resetSimulationData(): Promise<void> {
    this.logger.info('Resetting simulation data...');
    
    // TODO: Reset robots and tasks in database
    // This will be implemented in subsequent parts
    
    this.logger.info('Simulation data reset');
  }

  // Event System
  private emitEvent(eventType: EngineEventData['event_type'], data: any): void {
    const event: EngineEventData = {
      simulation_id: this.simulationId,
      event_type: eventType,
      timestamp: new Date(),
      data
    };

    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        this.logger.error('Error in event handler', { error, eventType });
      }
    });
  }

  // Snapshot and Statistics
  public getSnapshot(): SimulationSnapshot {
    return {
      id: this.simulationId,
      state: this.state,
      robots: new Map(this.robots),
      tasks: new Map(this.tasks),
      elapsed_time: this.elapsedTime,
      last_update: this.lastUpdate,
      statistics: {
        tasks_completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
        total_distance_traveled: 0, // TODO: Calculate from robot movements
        robot_utilization: this.robots.size > 0 ? 
          Array.from(this.robots.values()).filter(r => r.status !== 'idle').length / this.robots.size : 0
      }
    };
  }

  // Cleanup
  public async destroy(): Promise<void> {
    await this.stop();
    this.eventHandlers.length = 0;
    this.robots.clear();
    this.tasks.clear();
    
    this.logger.info('SimulationEngine destroyed');
  }
}