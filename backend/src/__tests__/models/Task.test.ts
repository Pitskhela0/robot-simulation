// backend/src/__tests__/models/Task.test.ts

import { Pool } from 'pg';
import { Task, TaskData, TaskType, TaskStatus, TASK_TYPE_SPECS } from '../../models/Task';
import { RobotVersion } from '../../models/Robot';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

describe('Task Model', () => {
  let pool: Pool;
  let taskModel: Task;
  let testHelper: TestDataHelper;
  let testUser: { id: number; username: string; email: string };
  let testSimulation: any;
  let testRobot: any;

  beforeAll(async () => {
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    pool = testPool;
    taskModel = new Task(pool);
    testHelper = new TestDataHelper(pool);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await testHelper.cleanupTestData();
    testUser = await testHelper.createTestUser();
    testSimulation = await testHelper.createTestSimulation(testUser.id, {
      grid_width: 20,
      grid_height: 20
    });
    testRobot = await testHelper.createTestRobot(testSimulation.id);
  });

  describe('create', () => {
    it('should create a new task with valid data', async () => {
      const taskData = {
        simulation_id: testSimulation.id,
        type: TaskType.PICKUP,
        description: 'Pick up package',
        target_x: 5,
        target_y: 10,
        priority: 2
      };

      const result = await taskModel.create(taskData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.simulation_id).toBe(testSimulation.id);
      expect(result.type).toBe(TaskType.PICKUP);
      expect(result.description).toBe('Pick up package');
      expect(result.target_x).toBe(5);
      expect(result.target_y).toBe(10);
      expect(result.priority).toBe(2);
      expect(result.status).toBe(TaskStatus.PENDING);
      expect(result.robot_id).toBeNull();
      expect(result.created_at).toBeDefined();
    });

    it('should create task with default values', async () => {
      const taskData = {
        simulation_id: testSimulation.id,
        type: TaskType.CLEANING,
        target_x: 0,
        target_y: 0
      };

      const result = await taskModel.create(taskData);

      expect(result.priority).toBe(1);
      expect(result.status).toBe(TaskStatus.PENDING);
      expect(result.robot_id).toBeNull();
    });

    it('should throw error for invalid simulation_id', async () => {
      const taskData = {
        simulation_id: 99999, // Non-existent simulation
        type: TaskType.PICKUP,
        target_x: 0,
        target_y: 0
      };

      await expect(taskModel.create(taskData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return task by valid ID', async () => {
      const created = await testHelper.createTestTask(testSimulation.id);
      
      const result = await taskModel.findById(created.id!);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.type).toBe(created.type);
    });

    it('should return null for non-existent ID', async () => {
      const result = await taskModel.findById(99999);

      expect(result).toBeNull();
    });
  });

  describe('findBySimulation', () => {
    it('should return paginated tasks for simulation', async () => {
      // Create test tasks
      await testHelper.createMultipleTasks(testSimulation.id, 5);

      const result = await taskModel.findBySimulation(testSimulation.id, { page: 1, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should return tasks ordered by priority and created_at', async () => {
      // Create tasks with different priorities
      await testHelper.createTestTask(testSimulation.id, { priority: 3 });
      await testHelper.createTestTask(testSimulation.id, { priority: 1 });
      await testHelper.createTestTask(testSimulation.id, { priority: 5 });

      const result = await taskModel.findBySimulation(testSimulation.id, { page: 1, limit: 10 });

      expect(result.data[0].priority).toBe(5); // Highest priority first
      expect(result.data[1].priority).toBe(3);
      expect(result.data[2].priority).toBe(1);
    });
  });

  describe('update', () => {
    it('should update task fields', async () => {
      const created = await testHelper.createTestTask(testSimulation.id);
      
      const updateData = {
        description: 'Updated description',
        target_x: 15,
        target_y: 8,
        priority: 5,
        status: TaskStatus.ASSIGNED as const
      };

      const result = await taskModel.update(created.id!, updateData);

      expect(result).toBeDefined();
      expect(result!.description).toBe('Updated description');
      expect(result!.target_x).toBe(15);
      expect(result!.target_y).toBe(8);
      expect(result!.priority).toBe(5);
      expect(result!.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should return null for non-existent task', async () => {
      const result = await taskModel.update(99999, { description: 'Test' });

      expect(result).toBeNull();
    });

    it('should throw error when no fields provided', async () => {
      const created = await testHelper.createTestTask(testSimulation.id);

      await expect(taskModel.update(created.id!, {})).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should delete pending task', async () => {
      const created = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.PENDING });
      
      const result = await taskModel.delete(created.id!);

      expect(result).toBe(true);

      // Verify deletion
      const found = await taskModel.findById(created.id!);
      expect(found).toBeNull();
    });

    it('should delete assigned task', async () => {
      const created = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.ASSIGNED });
      
      const result = await taskModel.delete(created.id!);

      expect(result).toBe(true);
    });

    it('should not delete in-progress task', async () => {
      const created = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.IN_PROGRESS });

      await expect(taskModel.delete(created.id!)).rejects.toThrow('Cannot delete task that is in progress or completed');
    });

    it('should not delete completed task', async () => {
      const created = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.COMPLETED });

      await expect(taskModel.delete(created.id!)).rejects.toThrow('Cannot delete task that is in progress or completed');
    });

    it('should return false for non-existent task', async () => {
      const result = await taskModel.delete(99999);

      expect(result).toBe(false);
    });
  });

  describe('task type specifications', () => {
    it('should return correct specs for each task type', async () => {
      expect(taskModel.getTaskTypeSpecs(TaskType.PICKUP)).toEqual(TASK_TYPE_SPECS.pickup);
      expect(taskModel.getTaskTypeSpecs(TaskType.PUTDOWN)).toEqual(TASK_TYPE_SPECS.putdown);
      expect(taskModel.getTaskTypeSpecs(TaskType.CLEANING)).toEqual(TASK_TYPE_SPECS.cleaning);
      expect(taskModel.getTaskTypeSpecs(TaskType.INSPECTION)).toEqual(TASK_TYPE_SPECS.inspection);
    });

    it('should calculate task duration correctly for different robot versions', async () => {
      // Pickup task: base 2 seconds
      const pickupV1 = taskModel.calculateTaskDuration(TaskType.PICKUP, RobotVersion.V1);
      const pickupV2 = taskModel.calculateTaskDuration(TaskType.PICKUP, RobotVersion.V2);
      const pickupV3 = taskModel.calculateTaskDuration(TaskType.PICKUP, RobotVersion.V3);

      expect(pickupV1).toBe(2.0); // 2 / 1.0
      expect(pickupV2).toBe(1.3333333333333333); // 2 / 1.5
      expect(pickupV3).toBe(1.0); // 2 / 2.0

      // Cleaning task: base 4 seconds
      const cleaningV1 = taskModel.calculateTaskDuration(TaskType.CLEANING, RobotVersion.V1);
      const cleaningV3 = taskModel.calculateTaskDuration(TaskType.CLEANING, RobotVersion.V3);

      expect(cleaningV1).toBe(4.0); // 4 / 1.0
      expect(cleaningV3).toBe(2.0); // 4 / 2.0
    });
  });

  describe('validation methods', () => {
    it('should validate coordinates within bounds', async () => {
      expect(taskModel.validateCoordinates(0, 0, 10, 10)).toBe(true);
      expect(taskModel.validateCoordinates(9, 9, 10, 10)).toBe(true);
      expect(taskModel.validateCoordinates(5, 7, 10, 10)).toBe(true);
    });

    it('should reject coordinates outside bounds', async () => {
      expect(taskModel.validateCoordinates(-1, 0, 10, 10)).toBe(false);
      expect(taskModel.validateCoordinates(0, -1, 10, 10)).toBe(false);
      expect(taskModel.validateCoordinates(10, 5, 10, 10)).toBe(false);
      expect(taskModel.validateCoordinates(5, 10, 10, 10)).toBe(false);
    });

    it('should validate priority values', async () => {
      expect(taskModel.validatePriority(1)).toBe(true);
      expect(taskModel.validatePriority(5)).toBe(true);
      expect(taskModel.validatePriority(10)).toBe(true);
    });

    it('should reject invalid priority values', async () => {
      expect(taskModel.validatePriority(0)).toBe(false);
      expect(taskModel.validatePriority(11)).toBe(false);
      expect(taskModel.validatePriority(-1)).toBe(false);
    });
  });

  describe('task status management', () => {
    it('should check if task can be assigned', async () => {
      const pendingTask = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.PENDING });
      const assignedTask = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.ASSIGNED });
      const inProgressTask = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.IN_PROGRESS });

      expect(taskModel.canBeAssigned(pendingTask)).toBe(true);
      expect(taskModel.canBeAssigned(assignedTask)).toBe(true);
      expect(taskModel.canBeAssigned(inProgressTask)).toBe(false);
    });

    it('should assign task to robot', async () => {
      const task = await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.PENDING });
      
      const result = await taskModel.assignToRobot(task.id!, testRobot.id);

      expect(result).toBeDefined();
      expect(result!.robot_id).toBe(testRobot.id);
      expect(result!.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should start task execution', async () => {
      const task = await testHelper.createTestTask(testSimulation.id, { 
        status: TaskStatus.ASSIGNED,
        robot_id: testRobot.id 
      });
      
      const result = await taskModel.startTask(task.id!);

      expect(result).toBeDefined();
      expect(result!.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result!.started_at).toBeDefined();
    });

    it('should complete task', async () => {
      const task = await testHelper.createTestTask(testSimulation.id, { 
        status: TaskStatus.IN_PROGRESS,
        robot_id: testRobot.id 
      });
      
      const result = await taskModel.completeTask(task.id!);

      expect(result).toBeDefined();
      expect(result!.status).toBe(TaskStatus.COMPLETED);
      expect(result!.completed_at).toBeDefined();
    });
  });

  describe('statistics and queries', () => {
    beforeEach(async () => {
      // Create tasks with different statuses and types
      await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.PENDING, type: TaskType.PICKUP });
      await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.ASSIGNED, type: TaskType.PICKUP });
      await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.COMPLETED, type: TaskType.CLEANING });
      await testHelper.createTestTask(testSimulation.id, { status: TaskStatus.FAILED, type: TaskType.INSPECTION });
    });

    it('should get count by status', async () => {
      const pendingCount = await taskModel.getCountByStatus(testSimulation.id, TaskStatus.PENDING);
      const assignedCount = await taskModel.getCountByStatus(testSimulation.id, TaskStatus.ASSIGNED);
      const completedCount = await taskModel.getCountByStatus(testSimulation.id, TaskStatus.COMPLETED);
      const failedCount = await taskModel.getCountByStatus(testSimulation.id, TaskStatus.FAILED);

      expect(pendingCount).toBe(1);
      expect(assignedCount).toBe(1);
      expect(completedCount).toBe(1);
      expect(failedCount).toBe(1);
    });

    it('should get count by type', async () => {
      const pickupCount = await taskModel.getCountByType(testSimulation.id, TaskType.PICKUP);
      const cleaningCount = await taskModel.getCountByType(testSimulation.id, TaskType.CLEANING);
      const inspectionCount = await taskModel.getCountByType(testSimulation.id, TaskType.INSPECTION);

      expect(pickupCount).toBe(2);
      expect(cleaningCount).toBe(1);
      expect(inspectionCount).toBe(1);
    });

    it('should get completion statistics', async () => {
      const stats = await taskModel.getCompletionStats(testSimulation.id);

      expect(stats.total).toBe(4);
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(0);
      expect(stats.failed).toBe(1);
      expect(stats.completionRate).toBe(25); // 1/4 = 25%
    });

    it('should find tasks by status', async () => {
      const pendingTasks = await taskModel.findByStatus(testSimulation.id, TaskStatus.PENDING);
      const completedTasks = await taskModel.findByStatus(testSimulation.id, TaskStatus.COMPLETED);

      expect(pendingTasks).toHaveLength(1);
      expect(completedTasks).toHaveLength(1);
    });
  });

  describe('exists', () => {
    it('should return true for existing task', async () => {
      const created = await testHelper.createTestTask(testSimulation.id);
      
      const result = await taskModel.exists(created.id!);

      expect(result).toBe(true);
    });

    it('should return false for non-existent task', async () => {
      const result = await taskModel.exists(99999);

      expect(result).toBe(false);
    });
  });
});