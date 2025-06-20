// backend/src/__tests__/models/Robot.test.ts

import { Pool } from 'pg';
import { Robot, RobotData, RobotVersion, RobotStatus, ROBOT_CAPABILITIES } from '../../models/Robot';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

describe('Robot Model', () => {
  let pool: Pool;
  let robotModel: Robot;
  let testHelper: TestDataHelper;
  let testUser: { id: number; username: string; email: string };
  let testSimulation: any;

  beforeAll(async () => {
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    pool = testPool;
    robotModel = new Robot(pool);
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
  });

  describe('create', () => {
    it('should create a new robot with valid data', async () => {
      const robotData = {
        simulation_id: testSimulation.id,
        name: 'Test Robot',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0,
        battery_level: 100
        // status is optional and will default to IDLE
      };

      const result = await robotModel.create(robotData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.simulation_id).toBe(testSimulation.id);
      expect(result.name).toBe('Test Robot');
      expect(result.version).toBe(RobotVersion.V1);
      expect(result.x_position).toBe(0);
      expect(result.y_position).toBe(0);
      expect(result.battery_level).toBe(100);
      expect(result.status).toBe(RobotStatus.IDLE);
      expect(result.direction).toBe('north');
      expect(result.color).toBe('#3B82F6');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create robot with default values', async () => {
      const robotData = {
        simulation_id: testSimulation.id,
        name: 'Default Robot',
        version: RobotVersion.V2,
        x_position: 5,
        y_position: 5,
        battery_level: 150
      };

      const result = await robotModel.create(robotData);

      expect(result.status).toBe(RobotStatus.IDLE);
      expect(result.direction).toBe('north');
      expect(result.color).toBe('#3B82F6');
    });

    it('should throw error for invalid simulation_id', async () => {
      const robotData = {
        simulation_id: 99999, // Non-existent simulation
        name: 'Invalid Simulation Robot',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0,
        battery_level: 100
        // status is optional
      };

      await expect(robotModel.create(robotData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return robot by valid ID', async () => {
      const created = await testHelper.createTestRobot(testSimulation.id);
      
      const result = await robotModel.findById(created.id!);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.name).toBe(created.name);
      expect(result!.version).toBe(created.version);
    });

    it('should return null for non-existent ID', async () => {
      const result = await robotModel.findById(99999);

      expect(result).toBeNull();
    });
  });

  describe('findBySimulation', () => {
    it('should return paginated robots for simulation', async () => {
      // Create test robots
      await testHelper.createMultipleRobots(testSimulation.id, 5);

      const result = await robotModel.findBySimulation(testSimulation.id, { page: 1, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should return empty array when no robots exist', async () => {
      const result = await robotModel.findBySimulation(testSimulation.id, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should return only robots for specific simulation', async () => {
      const otherSimulation = await testHelper.createTestSimulation(testUser.id);
      
      // Create robots for different simulations
      await testHelper.createMultipleRobots(testSimulation.id, 3);
      await testHelper.createMultipleRobots(otherSimulation.id!, 2); // Add ! to assert non-null

      const result = await robotModel.findBySimulation(testSimulation.id, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      result.data.forEach(robot => {
        expect(robot.simulation_id).toBe(testSimulation.id);
      });
    });
  });

  describe('update', () => {
    it('should update robot fields', async () => {
      const created = await testHelper.createTestRobot(testSimulation.id);
      
      const updateData = {
        name: 'Updated Robot',
        x_position: 10,
        y_position: 15,
        battery_level: 75,
        status: RobotStatus.MOVING as const
      };

      const result = await robotModel.update(created.id!, updateData);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Updated Robot');
      expect(result!.x_position).toBe(10);
      expect(result!.y_position).toBe(15);
      expect(result!.battery_level).toBe(75);
      expect(result!.status).toBe(RobotStatus.MOVING);
      expect(new Date(result!.updated_at!).getTime()).toBeGreaterThan(new Date(created.updated_at!).getTime());
    });

    it('should return null for non-existent robot', async () => {
      const result = await robotModel.update(99999, { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should throw error when no fields provided', async () => {
      const created = await testHelper.createTestRobot(testSimulation.id);

      await expect(robotModel.update(created.id!, {})).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should delete existing robot', async () => {
      const created = await testHelper.createTestRobot(testSimulation.id);
      
      const result = await robotModel.delete(created.id!);

      expect(result).toBe(true);

      // Verify deletion
      const found = await robotModel.findById(created.id!);
      expect(found).toBeNull();
    });

    it('should return false for non-existent robot', async () => {
      const result = await robotModel.delete(99999);

      expect(result).toBe(false);
    });
  });

  describe('capabilities and calculations', () => {
    it('should return correct capabilities for each version', async () => {
      const v1Capabilities = robotModel.getCapabilities(RobotVersion.V1);
      expect(v1Capabilities).toEqual(ROBOT_CAPABILITIES.V1);

      const v2Capabilities = robotModel.getCapabilities(RobotVersion.V2);
      expect(v2Capabilities).toEqual(ROBOT_CAPABILITIES.V2);

      const v3Capabilities = robotModel.getCapabilities(RobotVersion.V3);
      expect(v3Capabilities).toEqual(ROBOT_CAPABILITIES.V3);
    });

    it('should calculate task duration correctly', async () => {
      const baseTime = 10; // seconds

      const v1Duration = robotModel.calculateTaskDuration(RobotVersion.V1, baseTime);
      expect(v1Duration).toBe(10); // 10 / 1.0

      const v2Duration = robotModel.calculateTaskDuration(RobotVersion.V2, baseTime);
      expect(v2Duration).toBe(6.666666666666667); // 10 / 1.5

      const v3Duration = robotModel.calculateTaskDuration(RobotVersion.V3, baseTime);
      expect(v3Duration).toBe(5); // 10 / 2.0
    });

    it('should return correct battery capacity for each version', async () => {
      expect(robotModel.getMaxBatteryCapacity(RobotVersion.V1)).toBe(100);
      expect(robotModel.getMaxBatteryCapacity(RobotVersion.V2)).toBe(150);
      expect(robotModel.getMaxBatteryCapacity(RobotVersion.V3)).toBe(200);
    });

    it('should calculate charging rate correctly', async () => {
      expect(robotModel.getChargingRate(RobotVersion.V1)).toBe(10); // 10 * 1.0
      expect(robotModel.getChargingRate(RobotVersion.V2)).toBe(13); // 10 * 1.3
      expect(robotModel.getChargingRate(RobotVersion.V3)).toBe(15); // 10 * 1.5
    });
  });

  describe('validation methods', () => {
    it('should validate position within bounds', async () => {
      expect(robotModel.validatePosition(0, 0, 10, 10)).toBe(true);
      expect(robotModel.validatePosition(9, 9, 10, 10)).toBe(true);
      expect(robotModel.validatePosition(5, 7, 10, 10)).toBe(true);
    });

    it('should reject position outside bounds', async () => {
      expect(robotModel.validatePosition(-1, 0, 10, 10)).toBe(false);
      expect(robotModel.validatePosition(0, -1, 10, 10)).toBe(false);
      expect(robotModel.validatePosition(10, 5, 10, 10)).toBe(false);
      expect(robotModel.validatePosition(5, 10, 10, 10)).toBe(false);
    });

    it('should validate battery level for each version', async () => {
      expect(robotModel.validateBatteryLevel(50, RobotVersion.V1)).toBe(true);
      expect(robotModel.validateBatteryLevel(100, RobotVersion.V1)).toBe(true);
      expect(robotModel.validateBatteryLevel(150, RobotVersion.V2)).toBe(true);
      expect(robotModel.validateBatteryLevel(200, RobotVersion.V3)).toBe(true);
    });

    it('should reject invalid battery levels', async () => {
      expect(robotModel.validateBatteryLevel(-1, RobotVersion.V1)).toBe(false);
      expect(robotModel.validateBatteryLevel(101, RobotVersion.V1)).toBe(false);
      expect(robotModel.validateBatteryLevel(151, RobotVersion.V2)).toBe(false);
      expect(robotModel.validateBatteryLevel(201, RobotVersion.V3)).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should check robot availability correctly', async () => {
      const availableRobot: RobotData = {
        id: 1,
        simulation_id: testSimulation.id,
        name: 'Available Robot',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0,
        battery_level: 80,
        status: RobotStatus.IDLE
      };

      const unavailableRobot: RobotData = {
        ...availableRobot,
        status: RobotStatus.WORKING
      };

      const lowBatteryRobot: RobotData = {
        ...availableRobot,
        battery_level: 15
      };

      expect(robotModel.isAvailable(availableRobot)).toBe(true);
      expect(robotModel.isAvailable(unavailableRobot)).toBe(false);
      expect(robotModel.isAvailable(lowBatteryRobot)).toBe(false);
    });

    it('should find robots by status', async () => {
      await testHelper.createTestRobot(testSimulation.id, { status: RobotStatus.IDLE });
      await testHelper.createTestRobot(testSimulation.id, { status: RobotStatus.WORKING });
      await testHelper.createTestRobot(testSimulation.id, { status: RobotStatus.IDLE });

      const idleRobots = await robotModel.findByStatus(testSimulation.id, RobotStatus.IDLE);
      const workingRobots = await robotModel.findByStatus(testSimulation.id, RobotStatus.WORKING);

      expect(idleRobots).toHaveLength(2);
      expect(workingRobots).toHaveLength(1);
    });

    it('should get robot count by simulation', async () => {
      await testHelper.createMultipleRobots(testSimulation.id, 3);

      const count = await robotModel.getCountBySimulation(testSimulation.id);

      expect(count).toBe(3);
    });
  });

  describe('exists', () => {
    it('should return true for existing robot', async () => {
      const created = await testHelper.createTestRobot(testSimulation.id);
      
      const result = await robotModel.exists(created.id!);

      expect(result).toBe(true);
    });

    it('should return false for non-existent robot', async () => {
      const result = await robotModel.exists(99999);

      expect(result).toBe(false);
    });
  });
});