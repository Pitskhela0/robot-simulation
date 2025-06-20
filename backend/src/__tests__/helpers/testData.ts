// backend/src/__tests__/helpers/testData.ts - Updated with Robot methods

import { Pool } from 'pg';
import { SimulationData } from '../../models/Simulation';
import { RobotData, RobotVersion, RobotStatus } from '../../models/Robot';
import { TaskData, TaskType, TaskStatus } from '../../models/Task';

export class TestDataHelper {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create a test user
  async createTestUser(userData: {
    username?: string;
    email?: string;
    password_hash?: string;
  } = {}): Promise<{ id: number; username: string; email: string }> {
    const {
      username = 'testuser',
      email = 'test@example.com',
      password_hash = 'hashedpassword'
    } = userData;

    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
    `;

    const result = await this.pool.query(query, [username, email, password_hash]);
    return result.rows[0];
  }

  // Create a test simulation
  async createTestSimulation(user_id: number, simulationData: Partial<SimulationData> = {}): Promise<SimulationData> {
    const {
      name = 'Test Simulation',
      description = 'A test simulation',
      grid_width = 10,
      grid_height = 10,
      status = 'created'
    } = simulationData;

    const query = `
      INSERT INTO simulations (user_id, name, description, grid_width, grid_height, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(query, [user_id, name, description, grid_width, grid_height, status]);
    return result.rows[0];
  }

  // Create multiple test simulations
  async createMultipleSimulations(user_id: number, count: number): Promise<SimulationData[]> {
    const simulations = [];
    
    for (let i = 1; i <= count; i++) {
      const simulation = await this.createTestSimulation(user_id, {
        name: `Test Simulation ${i}`,
        description: `Test simulation number ${i}`,
        grid_width: 10 + i,
        grid_height: 10 + i,
        status: i % 2 === 0 ? 'completed' : 'created'
      });
      simulations.push(simulation);
    }

    return simulations;
  }

  // Create a test robot
  async createTestRobot(simulation_id: number, robotData: Partial<RobotData> = {}): Promise<RobotData> {
    const {
      name = 'Test Robot',
      version = RobotVersion.V1,
      x_position = 0,
      y_position = 0,
      direction = 'north',
      battery_level = 100,
      status = RobotStatus.IDLE, // Default status
      color = '#3B82F6'
    } = robotData;

    const query = `
      INSERT INTO robots (simulation_id, name, version, x_position, y_position, direction, battery_level, status, color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      simulation_id, name, version, x_position, y_position, direction, battery_level, status, color
    ]);
    return result.rows[0];
  }

  // Create multiple test robots
  async createMultipleRobots(simulation_id: number, count: number): Promise<RobotData[]> {
    const robots = [];
    const versions = [RobotVersion.V1, RobotVersion.V2, RobotVersion.V3];
    const statuses = [RobotStatus.IDLE, RobotStatus.MOVING, RobotStatus.WORKING, RobotStatus.CHARGING];
    
    for (let i = 1; i <= count; i++) {
      const version = versions[i % versions.length];
      const status = statuses[i % statuses.length];
      
      // Set appropriate battery level for version
      let batteryLevel = 100;
      if (version === RobotVersion.V2) batteryLevel = 150;
      if (version === RobotVersion.V3) batteryLevel = 200;
      
      const robot = await this.createTestRobot(simulation_id, {
        name: `Test Robot ${i}`,
        version,
        x_position: i % 5,
        y_position: Math.floor(i / 5),
        battery_level: Math.floor(batteryLevel * (0.5 + Math.random() * 0.5)), // Random battery 50-100%
        status,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
      });
      robots.push(robot);
    }

    return robots;
  }

  // Create robots with specific versions
  async createRobotsWithVersions(simulation_id: number, versions: RobotVersion[]): Promise<RobotData[]> {
    const robots = [];
    
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i];
      let batteryLevel = 100;
      if (version === RobotVersion.V2) batteryLevel = 150;
      if (version === RobotVersion.V3) batteryLevel = 200;
      
      const robot = await this.createTestRobot(simulation_id, {
        name: `${version} Robot ${i + 1}`,
        version,
        x_position: i,
        y_position: 0,
        battery_level: batteryLevel
      });
      robots.push(robot);
    }

    return robots;
  }

  // Create robots with specific statuses
  async createRobotsWithStatuses(simulation_id: number, statuses: RobotStatus[]): Promise<RobotData[]> {
    const robots = [];
    
    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      const robot = await this.createTestRobot(simulation_id, {
        name: `${status} Robot ${i + 1}`,
        x_position: i,
        y_position: 0,
        status
      });
      robots.push(robot);
    }

    return robots;
  }

  // Create a test task
  async createTestTask(simulation_id: number, taskData: Partial<TaskData> = {}): Promise<TaskData> {
    const {
      type = TaskType.PICKUP,
      description = 'Test task',
      target_x = 0,
      target_y = 0,
      priority = 1,
      status = TaskStatus.PENDING,
      robot_id = null
    } = taskData;

    const query = `
      INSERT INTO tasks (simulation_id, robot_id, type, description, target_x, target_y, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      simulation_id, robot_id, type, description, target_x, target_y, priority, status
    ]);
    return result.rows[0];
  }

  // Create multiple test tasks
  async createMultipleTasks(simulation_id: number, count: number): Promise<TaskData[]> {
    const tasks = [];
    const types = [TaskType.PICKUP, TaskType.PUTDOWN, TaskType.CLEANING, TaskType.INSPECTION];
    const statuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED];
    
    for (let i = 1; i <= count; i++) {
      const type = types[i % types.length];
      const status = statuses[i % statuses.length];
      
      const task = await this.createTestTask(simulation_id, {
        type,
        description: `Test task ${i}`,
        target_x: i % 10,
        target_y: Math.floor(i / 10),
        priority: (i % 5) + 1, // Priority 1-5
        status
      });
      tasks.push(task);
    }

    return tasks;
  }

  // Create tasks with specific types
  async createTasksWithTypes(simulation_id: number, types: TaskType[]): Promise<TaskData[]> {
    const tasks = [];
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const task = await this.createTestTask(simulation_id, {
        type,
        description: `${type} task ${i + 1}`,
        target_x: i,
        target_y: 0
      });
      tasks.push(task);
    }

    return tasks;
  }

  // Create tasks with specific statuses
  async createTasksWithStatuses(simulation_id: number, statuses: TaskStatus[]): Promise<TaskData[]> {
    const tasks = [];
    
    for (let i = 0; i < statuses.length; i++) {
      const status = statuses[i];
      const task = await this.createTestTask(simulation_id, {
        description: `${status} task ${i + 1}`,
        target_x: i,
        target_y: 0,
        status
      });
      tasks.push(task);
    }

    return tasks;
  }

  // Clean up test data
  async cleanupTestData(): Promise<void> {
    // Clean in reverse order due to foreign key constraints
    await this.pool.query('DELETE FROM tasks');
    await this.pool.query('DELETE FROM robots');
    await this.pool.query('DELETE FROM simulations');
    await this.pool.query('DELETE FROM users');
  }

  // Get simulation count
  async getSimulationCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM simulations');
    return parseInt(result.rows[0].count);
  }

  // Get user count
  async getUserCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }

  // Get robot count
  async getRobotCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM robots');
    return parseInt(result.rows[0].count);
  }

  // Get robot count by simulation
  async getRobotCountBySimulation(simulation_id: number): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM robots WHERE simulation_id = $1', [simulation_id]);
    return parseInt(result.rows[0].count);
  }

  // Get robot count by version
  async getRobotCountByVersion(version: RobotVersion): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM robots WHERE version = $1', [version]);
    return parseInt(result.rows[0].count);
  }

  // Get task count
  async getTaskCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM tasks');
    return parseInt(result.rows[0].count);
  }

  // Get task count by simulation
  async getTaskCountBySimulation(simulation_id: number): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM tasks WHERE simulation_id = $1', [simulation_id]);
    return parseInt(result.rows[0].count);
  }

  // Get task count by type
  async getTaskCountByType(type: TaskType): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM tasks WHERE type = $1', [type]);
    return parseInt(result.rows[0].count);
  }

  // Get task count by status
  async getTaskCountByStatus(status: TaskStatus): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM tasks WHERE status = $1', [status]);
    return parseInt(result.rows[0].count);
  }
}