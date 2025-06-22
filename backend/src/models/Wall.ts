// backend/src/models/Wall.ts

import { Pool, QueryResult } from 'pg';

export enum WallType {
  WALL = 'wall',
  BARRIER = 'barrier',
  OBSTACLE = 'obstacle'
}

export interface WallData {
  id?: number;
  simulation_id: number;
  x_position: number;
  y_position: number;
  type?: WallType;
  created_at?: Date;
}

export interface GridCoordinate {
  x: number;
  y: number;
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

export class Wall {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create a new wall
  async create(wallData: Omit<WallData, 'id' | 'created_at'>): Promise<WallData> {
    const {
      simulation_id,
      x_position,
      y_position,
      type = WallType.WALL
    } = wallData;

    const query = `
      INSERT INTO walls (simulation_id, x_position, y_position, type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [simulation_id, x_position, y_position, type];
    const result: QueryResult<WallData> = await this.pool.query(query, values);
    
    return result.rows[0];
  }

  // Create multiple walls (batch operation)
  async createBatch(wallsData: Omit<WallData, 'id' | 'created_at'>[]): Promise<WallData[]> {
    if (wallsData.length === 0) {
      return [];
    }

    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    wallsData.forEach((wall, index) => {
      const {
        simulation_id,
        x_position,
        y_position,
        type = WallType.WALL
      } = wall;

      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
      values.push(simulation_id, x_position, y_position, type);
      paramIndex += 4;
    });

    const query = `
      INSERT INTO walls (simulation_id, x_position, y_position, type)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result: QueryResult<WallData> = await this.pool.query(query, values);
    return result.rows;
  }

  // Get wall by ID
  async findById(id: number): Promise<WallData | null> {
    const query = 'SELECT * FROM walls WHERE id = $1';
    const result: QueryResult<WallData> = await this.pool.query(query, [id]);
    
    return result.rows[0] || null;
  }

  // Get walls by simulation ID
  async findBySimulation(simulationId: number): Promise<WallData[]> {
    const query = `
      SELECT * FROM walls 
      WHERE simulation_id = $1
      ORDER BY x_position, y_position
    `;
    const result: QueryResult<WallData> = await this.pool.query(query, [simulationId]);
    
    return result.rows;
  }

  // Get walls by simulation ID with pagination
  async findBySimulationPaginated(simulationId: number, options: PaginationOptions): Promise<PaginatedResult<WallData>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count for simulation
    const countQuery = 'SELECT COUNT(*) as count FROM walls WHERE simulation_id = $1';
    const countResult = await this.pool.query(countQuery, [simulationId]);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data for simulation
    const dataQuery = `
      SELECT * FROM walls 
      WHERE simulation_id = $1
      ORDER BY x_position, y_position
      LIMIT $2 OFFSET $3
    `;
    const dataResult: QueryResult<WallData> = await this.pool.query(dataQuery, [simulationId, limit, offset]);

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

  // Delete wall
  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM walls WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }

  // Delete all walls for a simulation
  async deleteBySimulation(simulationId: number): Promise<number> {
    const query = 'DELETE FROM walls WHERE simulation_id = $1';
    const result = await this.pool.query(query, [simulationId]);
    
    return result.rowCount ?? 0;
  }

  // Check if wall exists
  async exists(id: number): Promise<boolean> {
    const query = 'SELECT 1 FROM walls WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return result.rows.length > 0;
  }

  // Get wall count by simulation
  async getCountBySimulation(simulationId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM walls WHERE simulation_id = $1';
    const result = await this.pool.query(query, [simulationId]);
    
    return parseInt(result.rows[0].count);
  }

  // ===== GRID UTILITY FUNCTIONS =====

  // Check if coordinates are valid within grid bounds
  isValidCoordinate(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
    return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
  }

  // Check if a cell is occupied by a wall
  async isCellOccupied(x: number, y: number, simulationId: number): Promise<boolean> {
    const query = 'SELECT 1 FROM walls WHERE simulation_id = $1 AND x_position = $2 AND y_position = $3';
    const result = await this.pool.query(query, [simulationId, x, y]);
    
    return result.rows.length > 0;
  }

  // Check if a cell is occupied by any entity (walls, robots, etc.)
  async isCellOccupiedByAny(x: number, y: number, simulationId: number): Promise<{
    hasWall: boolean;
    hasRobot: boolean;
    robotId?: number;
  }> {
    // Check for walls
    const wallQuery = 'SELECT 1 FROM walls WHERE simulation_id = $1 AND x_position = $2 AND y_position = $3';
    const wallResult = await this.pool.query(wallQuery, [simulationId, x, y]);

    // Check for robots
    const robotQuery = 'SELECT id FROM robots WHERE simulation_id = $1 AND x_position = $2 AND y_position = $3';
    const robotResult = await this.pool.query(robotQuery, [simulationId, x, y]);

    return {
      hasWall: wallResult.rows.length > 0,
      hasRobot: robotResult.rows.length > 0,
      robotId: robotResult.rows[0]?.id
    };
  }

  // Get adjacent cells (up, down, left, right)
  getAdjacentCells(x: number, y: number): GridCoordinate[] {
    return [
      { x: x, y: y - 1 }, // North
      { x: x + 1, y: y }, // East
      { x: x, y: y + 1 }, // South
      { x: x - 1, y: y }  // West
    ];
  }

  // Get all 8 surrounding cells (including diagonals)
  getSurroundingCells(x: number, y: number): GridCoordinate[] {
    return [
      { x: x - 1, y: y - 1 }, // Northwest
      { x: x, y: y - 1 },     // North
      { x: x + 1, y: y - 1 }, // Northeast
      { x: x + 1, y: y },     // East
      { x: x + 1, y: y + 1 }, // Southeast
      { x: x, y: y + 1 },     // South
      { x: x - 1, y: y + 1 }, // Southwest
      { x: x - 1, y: y }      // West
    ];
  }




// Check if there's a direct path between two points (no walls blocking)
async isPathBlocked(fromX: number, fromY: number, toX: number, toY: number, simulationId: number): Promise<boolean> {
  // For diagonal movement, check if it's a clear diagonal path
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  
  // If it's a perfect diagonal (45-degree), allow movement around obstacles
  if (dx === dy && dx > 0) {
    // For diagonal paths, we don't block based on intermediate grid cells
    // This allows robots to move diagonally around obstacles
    return false;
  }
  
  // For straight lines (horizontal/vertical), use the original logic
  const points = this.getLinePoints(fromX, fromY, toX, toY);
  
  // Check each point along the path (excluding start and end points)
  for (let i = 1; i < points.length - 1; i++) {
    const point = points[i];
    if (await this.isCellOccupied(point.x, point.y, simulationId)) {
      return true; // Path is blocked
    }
  }
  
  return false; // Path is clear
}

// Get all points along a line using Bresenham's algorithm
private getLinePoints(x0: number, y0: number, x1: number, y1: number): GridCoordinate[] {
  const points: GridCoordinate[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

  // Validate wall placement (check against base station, other walls, etc.)
  async validateWallPlacement(x: number, y: number, simulationId: number, gridWidth: number, gridHeight: number): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check grid bounds
    if (!this.isValidCoordinate(x, y, gridWidth, gridHeight)) {
      return {
        valid: false,
        reason: `Coordinates (${x}, ${y}) are outside grid bounds (0,0) to (${gridWidth-1}, ${gridHeight-1})`
      };
    }

    // Check if cell is already occupied by a wall
    if (await this.isCellOccupied(x, y, simulationId)) {
      return {
        valid: false,
        reason: `Cell (${x}, ${y}) already contains a wall`
      };
    }

    // Check if cell is occupied by a robot
    const occupancy = await this.isCellOccupiedByAny(x, y, simulationId);
    if (occupancy.hasRobot) {
      return {
        valid: false,
        reason: `Cell (${x}, ${y}) is occupied by robot ${occupancy.robotId}`
      };
    }

    // Check against base station coordinates (assuming base is at 0,0 for now)
    // TODO: This should be configurable per simulation when base station coordinates are added
    if (x === 0 && y === 0) {
      return {
        valid: false,
        reason: 'Cannot place wall at base station coordinates (0, 0)'
      };
    }

    return { valid: true };
  }

  // Validate batch wall placement
  async validateBatchWallPlacement(
    wallsData: Omit<WallData, 'id' | 'created_at'>[],
    gridWidth: number,
    gridHeight: number
  ): Promise<{
    valid: boolean;
    errors: string[];
    validWalls: Omit<WallData, 'id' | 'created_at'>[];
  }> {
    const errors: string[] = [];
    const validWalls: Omit<WallData, 'id' | 'created_at'>[] = [];
    const coordinateSet = new Set<string>();

    for (let i = 0; i < wallsData.length; i++) {
      const wall = wallsData[i];
      const coordKey = `${wall.x_position},${wall.y_position}`;

      // Check for duplicates in the batch
      if (coordinateSet.has(coordKey)) {
        errors.push(`Duplicate coordinates (${wall.x_position}, ${wall.y_position}) in batch at index ${i}`);
        continue;
      }

      coordinateSet.add(coordKey);

      // Validate individual wall placement
      const validation = await this.validateWallPlacement(
        wall.x_position,
        wall.y_position,
        wall.simulation_id,
        gridWidth,
        gridHeight
      );

      if (validation.valid) {
        validWalls.push(wall);
      } else {
        errors.push(`Wall at index ${i}: ${validation.reason}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      validWalls
    };
  }

  // Get walls in a specific area (useful for pathfinding)
  async getWallsInArea(
    simulationId: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): Promise<WallData[]> {
    const query = `
      SELECT * FROM walls 
      WHERE simulation_id = $1 
        AND x_position >= $2 AND x_position <= $3
        AND y_position >= $4 AND y_position <= $5
      ORDER BY x_position, y_position
    `;
    
    const result: QueryResult<WallData> = await this.pool.query(query, [
      simulationId, minX, maxX, minY, maxY
    ]);
    
    return result.rows;
  }

  // Calculate Manhattan distance between two points
  getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  // Calculate Euclidean distance between two points
  getEuclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  // Get a grid representation of walls for visualization or pathfinding
  async getGridRepresentation(simulationId: number, gridWidth: number, gridHeight: number): Promise<number[][]> {
    // Initialize grid with 0s (empty cells)
    const grid = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0));

    // Get all walls for the simulation
    const walls = await this.findBySimulation(simulationId);

    // Mark walls as 1
    walls.forEach(wall => {
      if (wall.x_position < gridWidth && wall.y_position < gridHeight) {
        grid[wall.y_position][wall.x_position] = 1;
      }
    });

    return grid;
  }
}