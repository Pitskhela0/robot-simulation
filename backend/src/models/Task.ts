// backend/src/models/Task.ts

import { Pool, QueryResult } from 'pg';
import { RobotVersion, ROBOT_CAPABILITIES } from './Robot';

// Task type enum and specifications
export enum TaskType {
  PICKUP = 'pickup',
  PUTDOWN = 'putdown',
  CLEANING = 'cleaning',
  INSPECTION = 'inspection'
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface TaskTypeSpecs {
  baseTimeSeconds: number;
  description: string;
}

export const TASK_TYPE_SPECS: Record<TaskType, TaskTypeSpecs> = {
  [TaskType.PICKUP]: {
    baseTimeSeconds: 2.0,
    description: 'Pick up an object from the specified location'
  },
  [TaskType.PUTDOWN]: {
    baseTimeSeconds: 1.5,
    description: 'Put down an object at the specified location'
  },
  [TaskType.CLEANING]: {
    baseTimeSeconds: 4.0,
    description: 'Clean the specified area'
  },
  [TaskType.INSPECTION]: {
    baseTimeSeconds: 3.0,
    description: 'Inspect the specified location for issues'
  }
};

export interface TaskData {
  id?: number;
  simulation_id: number;
  robot_id?: number | null;
  type: TaskType;
  description?: string;
  target_x: number;
  target_y: number;
  priority?: number;
  status?: TaskStatus;
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

export class Task {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create a new task
  async create(taskData: Omit<TaskData, 'id' | 'created_at' | 'updated_at'>): Promise<TaskData> {
    const {
      simulation_id,
      robot_id = null,
      type,
      description,
      target_x,
      target_y,
      priority = 1,
      status = TaskStatus.PENDING
    } = taskData;

    const query = `
      INSERT INTO tasks (simulation_id, robot_id, type, description, target_x, target_y, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [simulation_id, robot_id, type, description, target_x, target_y, priority, status];
    const result: QueryResult<TaskData> = await this.pool.query(query, values);
    
    return result.rows[0];
  }

  // Get task by ID
  async findById(id: number): Promise<TaskData | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result: QueryResult<TaskData> = await this.pool.query(query, [id]);
    
    return result.rows[0] || null;
  }

  // Get tasks by simulation ID with pagination
  async findBySimulation(simulationId: number, options: PaginationOptions): Promise<PaginatedResult<TaskData>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count for simulation
    const countQuery = 'SELECT COUNT(*) as count FROM tasks WHERE simulation_id = $1';
    const countResult = await this.pool.query(countQuery, [simulationId]);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data for simulation
    const dataQuery = `
      SELECT * FROM tasks 
      WHERE simulation_id = $1
      ORDER BY priority DESC, created_at ASC 
      LIMIT $2 OFFSET $3
    `;
    const dataResult: QueryResult<TaskData> = await this.pool.query(dataQuery, [simulationId, limit, offset]);

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

  // Get tasks by robot ID
  async findByRobot(robotId: number): Promise<TaskData[]> {
    const query = 'SELECT * FROM tasks WHERE robot_id = $1 ORDER BY priority DESC, created_at ASC';
    const result: QueryResult<TaskData> = await this.pool.query(query, [robotId]);
    
    return result.rows;
  }

  // Get tasks by status
  async findByStatus(simulationId: number, status: TaskStatus): Promise<TaskData[]> {
    const query = 'SELECT * FROM tasks WHERE simulation_id = $1 AND status = $2 ORDER BY priority DESC, created_at ASC';
    const result: QueryResult<TaskData> = await this.pool.query(query, [simulationId, status]);
    
    return result.rows;
  }

  // Update task
  async update(id: number, updateData: Partial<Omit<TaskData, 'id' | 'created_at' | 'updated_at'>>): Promise<TaskData | null> {
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
      UPDATE tasks 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result: QueryResult<TaskData> = await this.pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete task
  async delete(id: number): Promise<boolean> {
    // Check if task can be deleted (only pending or assigned tasks)
    const task = await this.findById(id);
    if (!task) {
      return false;
    }

    if (task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.COMPLETED) {
      throw new Error('Cannot delete task that is in progress or completed');
    }

    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return (result.rowCount ?? 0) > 0;
  }

  // Check if task exists
  async exists(id: number): Promise<boolean> {
    const query = 'SELECT 1 FROM tasks WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    return result.rows.length > 0;
  }

  // Get task type specifications
  getTaskTypeSpecs(type: TaskType): TaskTypeSpecs {
    return TASK_TYPE_SPECS[type];
  }

  // Calculate task duration based on robot version and task type
  calculateTaskDuration(type: TaskType, robotVersion: RobotVersion): number {
    const taskSpecs = this.getTaskTypeSpecs(type);
    const robotCapabilities = ROBOT_CAPABILITIES[robotVersion];
    
    return taskSpecs.baseTimeSeconds / robotCapabilities.taskSpeedMultiplier;
  }

  // Validate task coordinates within grid bounds
  validateCoordinates(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
    return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
  }

  // Validate task priority
  validatePriority(priority: number): boolean {
    return priority >= 1 && priority <= 10;
  }

  // Check if task can be assigned to robot
  canBeAssigned(task: TaskData): boolean {
    return task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED;
  }

  // Check if task can be started
  canBeStarted(task: TaskData): boolean {
    return task.status === TaskStatus.ASSIGNED;
  }

  // Check if task can be completed
  canBeCompleted(task: TaskData): boolean {
    return task.status === TaskStatus.IN_PROGRESS;
  }

  // Assign task to robot
  async assignToRobot(taskId: number, robotId: number): Promise<TaskData | null> {
    const task = await this.findById(taskId);
    if (!task || !this.canBeAssigned(task)) {
      return null;
    }

    return await this.update(taskId, {
      robot_id: robotId,
      status: TaskStatus.ASSIGNED
    });
  }

  // Start task execution
  async startTask(taskId: number): Promise<TaskData | null> {
    const task = await this.findById(taskId);
    if (!task || !this.canBeStarted(task)) {
      return null;
    }

    return await this.update(taskId, {
      status: TaskStatus.IN_PROGRESS,
      started_at: new Date()
    });
  }

  // Complete task
  async completeTask(taskId: number): Promise<TaskData | null> {
    const task = await this.findById(taskId);
    if (!task || !this.canBeCompleted(task)) {
      return null;
    }

    return await this.update(taskId, {
      status: TaskStatus.COMPLETED,
      completed_at: new Date()
    });
  }

  // Get task count by status
  async getCountByStatus(simulationId: number, status: TaskStatus): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM tasks WHERE simulation_id = $1 AND status = $2';
    const result = await this.pool.query(query, [simulationId, status]);
    
    return parseInt(result.rows[0].count);
  }

  // Get task count by type
  async getCountByType(simulationId: number, type: TaskType): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM tasks WHERE simulation_id = $1 AND type = $2';
    const result = await this.pool.query(query, [simulationId, type]);
    
    return parseInt(result.rows[0].count);
  }

  // Get pending tasks for assignment
  async getPendingTasks(simulationId: number): Promise<TaskData[]> {
    return await this.findByStatus(simulationId, TaskStatus.PENDING);
  }

  // Get task completion statistics
  async getCompletionStats(simulationId: number): Promise<{
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    failed: number;
    completionRate: number;
  }> {
    const total = await this.getCountBySimulation(simulationId);
    const completed = await this.getCountByStatus(simulationId, TaskStatus.COMPLETED);
    const pending = await this.getCountByStatus(simulationId, TaskStatus.PENDING);
    const inProgress = await this.getCountByStatus(simulationId, TaskStatus.IN_PROGRESS);
    const failed = await this.getCountByStatus(simulationId, TaskStatus.FAILED);
    
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      pending,
      inProgress,
      failed,
      completionRate: Math.round(completionRate * 100) / 100 // Round to 2 decimal places
    };
  }

  // Get task count by simulation
  async getCountBySimulation(simulationId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM tasks WHERE simulation_id = $1';
    const result = await this.pool.query(query, [simulationId]);
    
    return parseInt(result.rows[0].count);
  }
}