// backend/src/__tests__/models/Simulation.test.ts

import { Pool } from 'pg';
import { Simulation, SimulationData } from '../../models/Simulation';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

describe('Simulation Model', () => {
  let pool: Pool;
  let simulationModel: Simulation;
  let testHelper: TestDataHelper;
  let testUser: { id: number; username: string; email: string };

  beforeAll(async () => {
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    pool = testPool;
    simulationModel = new Simulation(pool);
    testHelper = new TestDataHelper(pool);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await testHelper.cleanupTestData();
    testUser = await testHelper.createTestUser();
  });

  describe('create', () => {
    it('should create a new simulation with valid data', async () => {
      const simulationData = {
        user_id: testUser.id,
        name: 'Test Simulation',
        description: 'A test simulation',
        grid_width: 20,
        grid_height: 15
      };

      const result = await simulationModel.create(simulationData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(testUser.id);
      expect(result.name).toBe('Test Simulation');
      expect(result.description).toBe('A test simulation');
      expect(result.grid_width).toBe(20);
      expect(result.grid_height).toBe(15);
      expect(result.status).toBe('created');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });

    it('should create simulation with default status if not provided', async () => {
      const simulationData = {
        user_id: testUser.id,
        name: 'Default Status Test',
        grid_width: 10,
        grid_height: 10
      };

      const result = await simulationModel.create(simulationData);

      expect(result.status).toBe('created');
    });

    it('should throw error for invalid user_id', async () => {
      const simulationData = {
        user_id: 99999, // Non-existent user
        name: 'Invalid User Test',
        grid_width: 10,
        grid_height: 10
      };

      await expect(simulationModel.create(simulationData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return simulation by valid ID', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.findById(created.id!);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.name).toBe(created.name);
    });

    it('should return null for non-existent ID', async () => {
      const result = await simulationModel.findById(99999);

      expect(result).toBeNull();
    });
  });

  describe('findByIdAndUser', () => {
    it('should return simulation for correct user', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.findByIdAndUser(created.id!, testUser.id);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
    });

    it('should return null for wrong user', async () => {
      const otherUser = await testHelper.createTestUser({ 
        username: 'other', 
        email: 'other@example.com' 
      });
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.findByIdAndUser(created.id!, otherUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated simulations', async () => {
      // Create test simulations
      await testHelper.createMultipleSimulations(testUser.id, 5);

      const result = await simulationModel.findAll({ page: 1, limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should return empty array when no simulations exist', async () => {
      const result = await simulationModel.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle page beyond available data', async () => {
      await testHelper.createTestSimulation(testUser.id);

      const result = await simulationModel.findAll({ page: 5, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.page).toBe(5);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findByUser', () => {
    it('should return only simulations for specific user', async () => {
      const otherUser = await testHelper.createTestUser({ 
        username: 'other', 
        email: 'other@example.com' 
      });

      // Create simulations for different users
      await testHelper.createMultipleSimulations(testUser.id, 3);
      await testHelper.createMultipleSimulations(otherUser.id, 2);

      const result = await simulationModel.findByUser(testUser.id, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      result.data.forEach(sim => {
        expect(sim.user_id).toBe(testUser.id);
      });
    });
  });

  describe('update', () => {
    it('should update simulation fields', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        status: 'running' as const
      };

      const result = await simulationModel.update(created.id!, updateData);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Updated Name');
      expect(result!.description).toBe('Updated description');
      expect(result!.status).toBe('running');
      expect(new Date(result!.updated_at!).getTime()).toBeGreaterThan(new Date(created.updated_at!).getTime());
    });

    it('should return null for non-existent simulation', async () => {
      const result = await simulationModel.update(99999, { name: 'Test' });

      expect(result).toBeNull();
    });

    it('should throw error when no fields provided', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);

      await expect(simulationModel.update(created.id!, {})).rejects.toThrow('No fields to update');
    });
  });

  describe('updateByUser', () => {
    it('should update simulation for correct user', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.updateByUser(created.id!, testUser.id, { name: 'User Updated' });

      expect(result).toBeDefined();
      expect(result!.name).toBe('User Updated');
    });

    it('should return null for wrong user', async () => {
      const otherUser = await testHelper.createTestUser({ 
        username: 'other', 
        email: 'other@example.com' 
      });
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.updateByUser(created.id!, otherUser.id, { name: 'Should Fail' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete existing simulation', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.delete(created.id!);

      expect(result).toBe(true);

      // Verify deletion
      const found = await simulationModel.findById(created.id!);
      expect(found).toBeNull();
    });

    it('should return false for non-existent simulation', async () => {
      const result = await simulationModel.delete(99999);

      expect(result).toBe(false);
    });
  });

  describe('deleteByUser', () => {
    it('should delete simulation for correct user', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.deleteByUser(created.id!, testUser.id);

      expect(result).toBe(true);
    });

    it('should return false for wrong user', async () => {
      const otherUser = await testHelper.createTestUser({ 
        username: 'other', 
        email: 'other@example.com' 
      });
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.deleteByUser(created.id!, otherUser.id);

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing simulation', async () => {
      const created = await testHelper.createTestSimulation(testUser.id);
      
      const result = await simulationModel.exists(created.id!);

      expect(result).toBe(true);
    });

    it('should return false for non-existent simulation', async () => {
      const result = await simulationModel.exists(99999);

      expect(result).toBe(false);
    });
  });

  describe('getCountByStatus', () => {
    it('should return correct count for each status', async () => {
      // Create simulations with different statuses
      await testHelper.createTestSimulation(testUser.id, { status: 'created' });
      await testHelper.createTestSimulation(testUser.id, { status: 'created' });
      await testHelper.createTestSimulation(testUser.id, { status: 'running' });
      await testHelper.createTestSimulation(testUser.id, { status: 'completed' });

      const createdCount = await simulationModel.getCountByStatus('created');
      const runningCount = await simulationModel.getCountByStatus('running');
      const completedCount = await simulationModel.getCountByStatus('completed');
      const pausedCount = await simulationModel.getCountByStatus('paused');

      expect(createdCount).toBe(2);
      expect(runningCount).toBe(1);
      expect(completedCount).toBe(1);
      expect(pausedCount).toBe(0);
    });
  });

  describe('validateCoordinates', () => {
    it('should validate coordinates within bounds', async () => {
      expect(simulationModel.validateCoordinates(0, 0, 10, 10)).toBe(true);
      expect(simulationModel.validateCoordinates(9, 9, 10, 10)).toBe(true);
      expect(simulationModel.validateCoordinates(5, 7, 10, 10)).toBe(true);
    });

    it('should reject coordinates outside bounds', async () => {
      expect(simulationModel.validateCoordinates(-1, 0, 10, 10)).toBe(false);
      expect(simulationModel.validateCoordinates(0, -1, 10, 10)).toBe(false);
      expect(simulationModel.validateCoordinates(10, 5, 10, 10)).toBe(false);
      expect(simulationModel.validateCoordinates(5, 10, 10, 10)).toBe(false);
    });
  });

  describe('validateGridDimensions', () => {
    it('should validate dimensions within allowed range', async () => {
      expect(simulationModel.validateGridDimensions(5, 5)).toBe(true);
      expect(simulationModel.validateGridDimensions(50, 75)).toBe(true);
      expect(simulationModel.validateGridDimensions(100, 100)).toBe(true);
    });

    it('should reject dimensions outside allowed range', async () => {
      expect(simulationModel.validateGridDimensions(4, 10)).toBe(false);
      expect(simulationModel.validateGridDimensions(10, 4)).toBe(false);
      expect(simulationModel.validateGridDimensions(101, 50)).toBe(false);
      expect(simulationModel.validateGridDimensions(50, 101)).toBe(false);
    });
  });
});