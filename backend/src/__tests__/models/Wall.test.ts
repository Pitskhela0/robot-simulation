// backend/src/__tests__/models/Wall.test.ts

import { Pool } from 'pg';
import { Wall, WallData, WallType } from '../../models/Wall';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

describe('Wall Model', () => {
  let pool: Pool;
  let wallModel: Wall;
  let testHelper: TestDataHelper;
  let testUser: { id: number; username: string; email: string };
  let testSimulation: any;

  beforeAll(async () => {
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    pool = testPool;
    wallModel = new Wall(pool);
    testHelper = new TestDataHelper(pool);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await testHelper.cleanupTestData();
    testUser = await testHelper.createTestUser();
    testSimulation = await testHelper.createTestSimulation(testUser.id, {
      grid_width: 10,
      grid_height: 10
    });
  });

  describe('create', () => {
    it('should create a new wall with valid data', async () => {
      const wallData = {
        simulation_id: testSimulation.id,
        x_position: 5,
        y_position: 3,
        type: WallType.WALL
      };

      const result = await wallModel.create(wallData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.simulation_id).toBe(testSimulation.id);
      expect(result.x_position).toBe(5);
      expect(result.y_position).toBe(3);
      expect(result.type).toBe(WallType.WALL);
      expect(result.created_at).toBeDefined();
    });

    it('should create wall with default type', async () => {
      const wallData = {
        simulation_id: testSimulation.id,
        x_position: 2,
        y_position: 7
      };

      const result = await wallModel.create(wallData);

      expect(result.type).toBe(WallType.WALL);
    });

    it('should throw error for invalid simulation_id', async () => {
      const wallData = {
        simulation_id: 99999, // Non-existent simulation
        x_position: 1,
        y_position: 1
      };

      await expect(wallModel.create(wallData)).rejects.toThrow();
    });
  });

  describe('createBatch', () => {
    it('should create multiple walls successfully', async () => {
      const wallsData = [
        { simulation_id: testSimulation.id, x_position: 1, y_position: 1 },
        { simulation_id: testSimulation.id, x_position: 2, y_position: 2 },
        { simulation_id: testSimulation.id, x_position: 3, y_position: 3 }
      ];

      const result = await wallModel.createBatch(wallsData);

      expect(result).toHaveLength(3);
      expect(result[0].x_position).toBe(1);
      expect(result[1].x_position).toBe(2);
      expect(result[2].x_position).toBe(3);
    });

    it('should return empty array for empty input', async () => {
      const result = await wallModel.createBatch([]);

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return wall by valid ID', async () => {
      const created = await testHelper.createTestWall(testSimulation.id);
      
      const result = await wallModel.findById(created.id!);

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.x_position).toBe(created.x_position);
      expect(result!.y_position).toBe(created.y_position);
    });

    it('should return null for non-existent ID', async () => {
      const result = await wallModel.findById(99999);

      expect(result).toBeNull();
    });
  });

  describe('findBySimulation', () => {
    it('should return walls for simulation', async () => {
      await testHelper.createMultipleWalls(testSimulation.id, 5);

      const result = await wallModel.findBySimulation(testSimulation.id);

      expect(result).toHaveLength(5);
      result.forEach(wall => {
        expect(wall.simulation_id).toBe(testSimulation.id);
      });
    });

    it('should return walls ordered by coordinates', async () => {
      await testHelper.createTestWall(testSimulation.id, { x_position: 5, y_position: 5 });
      await testHelper.createTestWall(testSimulation.id, { x_position: 1, y_position: 1 });
      await testHelper.createTestWall(testSimulation.id, { x_position: 3, y_position: 3 });

      const result = await wallModel.findBySimulation(testSimulation.id);

      expect(result[0].x_position).toBe(1);
      expect(result[1].x_position).toBe(3);
      expect(result[2].x_position).toBe(5);
    });

    it('should return empty array when no walls exist', async () => {
      const result = await wallModel.findBySimulation(testSimulation.id);

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete existing wall', async () => {
      const created = await testHelper.createTestWall(testSimulation.id);
      
      const result = await wallModel.delete(created.id!);

      expect(result).toBe(true);

      // Verify deletion
      const found = await wallModel.findById(created.id!);
      expect(found).toBeNull();
    });

    it('should return false for non-existent wall', async () => {
      const result = await wallModel.delete(99999);

      expect(result).toBe(false);
    });
  });

  describe('grid utility functions', () => {
    describe('isValidCoordinate', () => {
      it('should validate coordinates within bounds', () => {
        expect(wallModel.isValidCoordinate(0, 0, 10, 10)).toBe(true);
        expect(wallModel.isValidCoordinate(9, 9, 10, 10)).toBe(true);
        expect(wallModel.isValidCoordinate(5, 7, 10, 10)).toBe(true);
      });

      it('should reject coordinates outside bounds', () => {
        expect(wallModel.isValidCoordinate(-1, 0, 10, 10)).toBe(false);
        expect(wallModel.isValidCoordinate(0, -1, 10, 10)).toBe(false);
        expect(wallModel.isValidCoordinate(10, 5, 10, 10)).toBe(false);
        expect(wallModel.isValidCoordinate(5, 10, 10, 10)).toBe(false);
      });
    });

    describe('isCellOccupied', () => {
      it('should detect occupied cells', async () => {
        await testHelper.createTestWall(testSimulation.id, { x_position: 5, y_position: 5 });

        const occupied = await wallModel.isCellOccupied(5, 5, testSimulation.id);
        const empty = await wallModel.isCellOccupied(3, 3, testSimulation.id);

        expect(occupied).toBe(true);
        expect(empty).toBe(false);
      });
    });

    describe('getAdjacentCells', () => {
      it('should return correct adjacent cells', () => {
        const adjacent = wallModel.getAdjacentCells(5, 5);

        expect(adjacent).toEqual([
          { x: 5, y: 4 }, // North
          { x: 6, y: 5 }, // East
          { x: 5, y: 6 }, // South
          { x: 4, y: 5 }  // West
        ]);
      });
    });

    describe('getSurroundingCells', () => {
      it('should return all 8 surrounding cells', () => {
        const surrounding = wallModel.getSurroundingCells(5, 5);

        expect(surrounding).toHaveLength(8);
        expect(surrounding).toContainEqual({ x: 4, y: 4 }); // Northwest
        expect(surrounding).toContainEqual({ x: 5, y: 4 }); // North
        expect(surrounding).toContainEqual({ x: 6, y: 4 }); // Northeast
        expect(surrounding).toContainEqual({ x: 6, y: 5 }); // East
        expect(surrounding).toContainEqual({ x: 6, y: 6 }); // Southeast
        expect(surrounding).toContainEqual({ x: 5, y: 6 }); // South
        expect(surrounding).toContainEqual({ x: 4, y: 6 }); // Southwest
        expect(surrounding).toContainEqual({ x: 4, y: 5 }); // West
      });
    });

    describe('isPathBlocked', () => {
      it('should detect clear path', async () => {
        const isBlocked = await wallModel.isPathBlocked(0, 0, 3, 0, testSimulation.id);

        expect(isBlocked).toBe(false);
      });

      it('should detect blocked path', async () => {
        // Create wall in the middle of the path
        await testHelper.createTestWall(testSimulation.id, { x_position: 1, y_position: 0 });

        const isBlocked = await wallModel.isPathBlocked(0, 0, 3, 0, testSimulation.id);

        expect(isBlocked).toBe(true);
      });

      it('should allow diagonal paths around obstacles', async () => {
        // Create wall that blocks horizontal path but not diagonal
        await testHelper.createTestWall(testSimulation.id, { x_position: 1, y_position: 1 });

        const horizontalBlocked = await wallModel.isPathBlocked(0, 1, 2, 1, testSimulation.id);
        const diagonalClear = await wallModel.isPathBlocked(0, 0, 2, 2, testSimulation.id);

        expect(horizontalBlocked).toBe(true);
        expect(diagonalClear).toBe(false);
      });
    });

    describe('distance calculations', () => {
      it('should calculate Manhattan distance correctly', () => {
        expect(wallModel.getManhattanDistance(0, 0, 3, 4)).toBe(7);
        expect(wallModel.getManhattanDistance(5, 5, 5, 5)).toBe(0);
        expect(wallModel.getManhattanDistance(1, 1, 4, 5)).toBe(7);
      });

      it('should calculate Euclidean distance correctly', () => {
        expect(wallModel.getEuclideanDistance(0, 0, 3, 4)).toBe(5);
        expect(wallModel.getEuclideanDistance(0, 0, 0, 0)).toBe(0);
        expect(Math.round(wallModel.getEuclideanDistance(1, 1, 4, 5) * 100) / 100).toBe(5);
      });
    });
  });

  describe('wall placement validation', () => {
    it('should validate valid wall placement', async () => {
      const validation = await wallModel.validateWallPlacement(5, 5, testSimulation.id, 10, 10);

      expect(validation.valid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });

    it('should reject placement outside grid bounds', async () => {
      const validation = await wallModel.validateWallPlacement(15, 5, testSimulation.id, 10, 10);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('outside grid bounds');
    });

    it('should reject placement at occupied coordinates', async () => {
      await testHelper.createTestWall(testSimulation.id, { x_position: 5, y_position: 5 });

      const validation = await wallModel.validateWallPlacement(5, 5, testSimulation.id, 10, 10);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('already contains a wall');
    });

    it('should reject placement at base station coordinates', async () => {
      const validation = await wallModel.validateWallPlacement(0, 0, testSimulation.id, 10, 10);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('base station coordinates');
    });

    it('should reject placement where robot exists', async () => {
      const robot = await testHelper.createTestRobot(testSimulation.id, { x_position: 3, y_position: 3 });

      const validation = await wallModel.validateWallPlacement(3, 3, testSimulation.id, 10, 10);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('occupied by robot');
    });
  });

  describe('batch validation', () => {
    it('should validate valid batch walls', async () => {
      const wallsData = [
        { simulation_id: testSimulation.id, x_position: 1, y_position: 1 },
        { simulation_id: testSimulation.id, x_position: 2, y_position: 2 }
      ];

      const validation = await wallModel.validateBatchWallPlacement(wallsData, 10, 10);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.validWalls).toHaveLength(2);
    });

    it('should detect duplicate coordinates in batch', async () => {
      const wallsData = [
        { simulation_id: testSimulation.id, x_position: 1, y_position: 1 },
        { simulation_id: testSimulation.id, x_position: 1, y_position: 1 }
      ];

      const validation = await wallModel.validateBatchWallPlacement(wallsData, 10, 10);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate coordinates (1, 1) in batch at index 1');
      expect(validation.validWalls).toHaveLength(1);
    });
  });

  describe('grid representation', () => {
    it('should generate correct grid representation', async () => {
      await testHelper.createTestWall(testSimulation.id, { x_position: 1, y_position: 1 });
      await testHelper.createTestWall(testSimulation.id, { x_position: 2, y_position: 2 });

      const grid = await wallModel.getGridRepresentation(testSimulation.id, 4, 4);

      expect(grid).toHaveLength(4); // Height
      expect(grid[0]).toHaveLength(4); // Width
      expect(grid[1][1]).toBe(1); // Wall at (1,1)
      expect(grid[2][2]).toBe(1); // Wall at (2,2)
      expect(grid[0][0]).toBe(0); // Empty cell
      expect(grid[3][3]).toBe(0); // Empty cell
    });
  });

  describe('area queries', () => {
    it('should find walls in specific area', async () => {
      await testHelper.createTestWall(testSimulation.id, { x_position: 1, y_position: 1 });
      await testHelper.createTestWall(testSimulation.id, { x_position: 2, y_position: 2 });
      await testHelper.createTestWall(testSimulation.id, { x_position: 5, y_position: 5 });

      const wallsInArea = await wallModel.getWallsInArea(testSimulation.id, 0, 0, 3, 3);

      expect(wallsInArea).toHaveLength(2);
      expect(wallsInArea.some(w => w.x_position === 1 && w.y_position === 1)).toBe(true);
      expect(wallsInArea.some(w => w.x_position === 2 && w.y_position === 2)).toBe(true);
      expect(wallsInArea.some(w => w.x_position === 5 && w.y_position === 5)).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true for existing wall', async () => {
      const created = await testHelper.createTestWall(testSimulation.id);
      
      const result = await wallModel.exists(created.id!);

      expect(result).toBe(true);
    });

    it('should return false for non-existent wall', async () => {
      const result = await wallModel.exists(99999);

      expect(result).toBe(false);
    });
  });

  describe('deleteBySimulation', () => {
    it('should delete all walls for simulation', async () => {
      await testHelper.createMultipleWalls(testSimulation.id, 5);
      
      const deletedCount = await wallModel.deleteBySimulation(testSimulation.id);

      expect(deletedCount).toBe(5);

      // Verify all walls are deleted
      const remainingWalls = await wallModel.findBySimulation(testSimulation.id);
      expect(remainingWalls).toHaveLength(0);
    });

    it('should return 0 when no walls to delete', async () => {
      const deletedCount = await wallModel.deleteBySimulation(testSimulation.id);

      expect(deletedCount).toBe(0);
    });
  });

  describe('getCountBySimulation', () => {
    it('should return correct wall count', async () => {
      await testHelper.createMultipleWalls(testSimulation.id, 3);

      const count = await wallModel.getCountBySimulation(testSimulation.id);

      expect(count).toBe(3);
    });

    it('should return 0 for simulation with no walls', async () => {
      const count = await wallModel.getCountBySimulation(testSimulation.id);

      expect(count).toBe(0);
    });
  });
});