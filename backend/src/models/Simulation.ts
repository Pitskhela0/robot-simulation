// backend/src/models/Simulation.ts

import { Pool, QueryResult } from 'pg';

export interface SimulationData {
  id?: number;
  user_id: number;
  name: string;
  description?: string;
  grid_width: number;
  grid_height: number;
  status?: 'created' | 'running' | 'paused' | 'completed' | 'failed';
  created_at?: Date;
  updated_at?: Date;
  started_at?: Date;
  completed_at?: Date;
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

export class Simulation {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create a new simulation
  async create(simulationData: Omit<SimulationData, 'id' | 'created_at' | 'updated_at'>): Promise<SimulationData> {
    const {
      user_id,
      name,
      description,
      grid_width,
      grid_height,
      status = 'created'
    } = simulationData;

    const query = `
      INSERT INTO simulations (user_id, name, description, grid_width, grid_height, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [user_id, name, description, grid_width, grid_height, status];
    const result: QueryResult<SimulationData> = await this.pool.query(query, values);
    
    return result.rows[0];
  }

  // Get simulation by ID
  async findById(id: number): Promise<SimulationData | null> {
    const query = 'SELECT * FROM simulations WHERE id = $1';
    const result: QueryResult<SimulationData> = await this.pool.query(query, [id]);
    
    return result.rows[0] || null;
  }

  // Get simulation by ID with user check
  async findByIdAndUser(id: number, userId: number): Promise<SimulationData | null> {
    const query = 'SELECT * FROM simulations WHERE id = $1 AND user_id = $2';
    const result: QueryResult<SimulationData> = await this.pool.query(query, [id, userId]);
    
    return result.rows[0] || null;
  }

  // Get all simulations with pagination
  async findAll(options: PaginationOptions): Promise<PaginatedResult<SimulationData>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = 'SELECT COUNT(*) as count FROM simulations';
    const countResult = await this.pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT * FROM simulations 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const dataResult: QueryResult<SimulationData> = await this.pool.query(dataQuery, [limit, offset]);

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

  // Get simulations by user with pagination
  async findByUser(userId: number, options: PaginationOptions): Promise<PaginatedResult<SimulationData>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count for user
    const countQuery = 'SELECT COUNT(*) as count FROM simulations WHERE user_id = $1';
    const countResult = await this.pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data for user
    const dataQuery = `
      SELECT * FROM simulations 
      WHERE user_id = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const dataResult: QueryResult<SimulationData> = await this.pool.query(dataQuery, [userId, limit, offset]);

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

  // Update simulation
  async update(id: number, updateData: Partial<Omit<SimulationData, 'id' | 'created_at' | 'updated_at'>>): Promise<SimulationData | null> {
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
      UPDATE simulations 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result: QueryResult<SimulationData> = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  // Update simulation with user check
  async updateByUser(id: number, userId: number, updateData: Partial<Omit<SimulationData, 'id' | 'created_at' | 'updated_at'>>): Promise<SimulationData | null> {
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
    values.push(id, userId);

    const query = `
      UPDATE simulations 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;

    const result: QueryResult<SimulationData> = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete simulation
  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM simulations WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
return (result.rowCount ?? 0) > 0;
  }

  // Delete simulation with user check
  async deleteByUser(id: number, userId: number): Promise<boolean> {
    const query = 'DELETE FROM simulations WHERE id = $1 AND user_id = $2';
    const result = await this.pool.query(query, [id, userId]);
    
return (result.rowCount ?? 0) > 0;
  }

  // Check if simulation exists
  async exists(id: number): Promise<boolean> {
    const query = 'SELECT 1 FROM simulations WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return result.rows.length > 0;
  }

  // Get simulation count by status
  async getCountByStatus(status: SimulationData['status']): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM simulations WHERE status = $1';
    const result = await this.pool.query(query, [status]);
    
    return parseInt(result.rows[0].count);
  }

  // Validate grid coordinates are within bounds
  validateCoordinates(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
    return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
  }

  // Validate grid dimensions
  validateGridDimensions(width: number, height: number): boolean {
    return width >= 5 && width <= 100 && height >= 5 && height <= 100;
  }
}