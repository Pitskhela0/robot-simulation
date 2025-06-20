// backend/src/models/Robot.ts

import { Pool, QueryResult } from 'pg';

// Robot version enum and capabilities
export enum RobotVersion {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3'
}

export enum RobotStatus {
  IDLE = 'idle',
  MOVING = 'moving',
  WORKING = 'working',
  CHARGING = 'charging'
}

export interface RobotCapabilities {
  taskSpeedMultiplier: number;
  batteryCapacity: number;
  chargeSpeedMultiplier: number;
}

export const ROBOT_CAPABILITIES: Record<RobotVersion, RobotCapabilities> = {
  [RobotVersion.V1]: {
    taskSpeedMultiplier: 1.0,
    batteryCapacity: 100,
    chargeSpeedMultiplier: 1.0
  },
  [RobotVersion.V2]: {
    taskSpeedMultiplier: 1.5,
    batteryCapacity: 150,
    chargeSpeedMultiplier: 1.3
  },
  [RobotVersion.V3]: {
    taskSpeedMultiplier: 2.0,
    batteryCapacity: 200,
    chargeSpeedMultiplier: 1.5
  }
};

export interface RobotData {
  id?: number;
  simulation_id: number;
  name: string;
  version: RobotVersion;
  x_position: number;
  y_position: number;
  direction?: string;
  battery_level: number;
  status?: RobotStatus; // Make status optional in interface
  color?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class Robot {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create a new robot
  async create(robotData: Omit<RobotData, 'id' | 'created_at' | 'updated_at'>): Promise<RobotData> {
    const {
      simulation_id,
      name,
      version,
      x_position,
      y_position,
      direction = 'north',
      battery_level,
      status = RobotStatus.IDLE, // Default status if not provided
      color = '#3B82F6'
    } = robotData;

    const query = `
      INSERT INTO robots (simulation_id, name, version, x_position, y_position, direction, battery_level, status, color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [simulation_id, name, version, x_position, y_position, direction, battery_level, status, color];
    const result: QueryResult<RobotData> = await this.pool.query(query, values);
    
    return result.rows[0];
  }

  // Get robot by ID
  async findById(id: number): Promise<RobotData | null> {
    const query = 'SELECT * FROM robots WHERE id = $1';
    const result: QueryResult<RobotData> = await this.pool.query(query, [id]);
    
    return result.rows[0] || null;
  }

  // Get robots by simulation ID with pagination
  async findBySimulation(simulationId: number, options: PaginationOptions): Promise<PaginatedResult<RobotData>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count for simulation
    const countQuery = 'SELECT COUNT(*) as count FROM robots WHERE simulation_id = $1';
    const countResult = await this.pool.query(countQuery, [simulationId]);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data for simulation
    const dataQuery = `
      SELECT * FROM robots 
      WHERE simulation_id = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const dataResult: QueryResult<RobotData> = await this.pool.query(dataQuery, [simulationId, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Update robot
  async update(id: number, updateData: Partial<Omit<RobotData, 'id' | 'created_at' | 'updated_at'>>): Promise<RobotData | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE robots 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result: QueryResult<RobotData> = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete robot
  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM robots WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }

  // Check if robot exists
  async exists(id: number): Promise<boolean> {
    const query = 'SELECT 1 FROM robots WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return result.rows.length > 0;
  }

  // Get robot capabilities based on version
  getCapabilities(version: RobotVersion): RobotCapabilities {
    return ROBOT_CAPABILITIES[version];
  }

  // Calculate task duration based on robot version and base time
  calculateTaskDuration(version: RobotVersion, baseTimeSeconds: number): number {
    const capabilities = this.getCapabilities(version);
    return baseTimeSeconds / capabilities.taskSpeedMultiplier;
  }

  // Get maximum battery capacity for robot version
  getMaxBatteryCapacity(version: RobotVersion): number {
    return this.getCapabilities(version).batteryCapacity;
  }

  // Calculate charging rate per update cycle
  getChargingRate(version: RobotVersion): number {
    const capabilities = this.getCapabilities(version);
    // Base charging rate: 10% per cycle, modified by charge speed multiplier
    return 10 * capabilities.chargeSpeedMultiplier;
  }

  // Validate robot position within grid bounds
  validatePosition(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
    return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
  }

  // Validate battery level
  validateBatteryLevel(batteryLevel: number, version: RobotVersion): boolean {
    const maxCapacity = this.getMaxBatteryCapacity(version);
    return batteryLevel >= 0 && batteryLevel <= maxCapacity;
  }

  // Check if robot is available for task assignment
  isAvailable(robot: RobotData): boolean {
    return robot.status === RobotStatus.IDLE && robot.battery_level > 20;
  }

  // Get robots by status
  async findByStatus(simulationId: number, status: RobotStatus): Promise<RobotData[]> {
    const query = 'SELECT * FROM robots WHERE simulation_id = $1 AND status = $2';
    const result: QueryResult<RobotData> = await this.pool.query(query, [simulationId, status]);
    
    return result.rows;
  }

  // Get robot count by simulation
  async getCountBySimulation(simulationId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM robots WHERE simulation_id = $1';
    const result = await this.pool.query(query, [simulationId]);
    
    return parseInt(result.rows[0].count);
  }

  // Validate robot placement at base coordinates
  async validateBaseStationPlacement(simulationId: number, x: number, y: number): Promise<boolean> {
    // Get simulation to check base station coordinates
    const simQuery = 'SELECT * FROM simulations WHERE id = $1';
    const simResult = await this.pool.query(simQuery, [simulationId]);
    
    if (simResult.rows.length === 0) {
      return false;
    }

    // For now, we'll assume base station is at (0,0) - this can be enhanced later
    // when base station coordinates are added to simulations table
    const baseX = 0;
    const baseY = 0;
    
    return x === baseX && y === baseY;
  }
}