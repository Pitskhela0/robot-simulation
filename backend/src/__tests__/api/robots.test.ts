// backend/src/__tests__/api/robots.test.ts

import request from 'supertest';
import { Pool } from 'pg';
import express from 'express';
import cors from 'cors';
import robotRoutes from '../../routes/robots';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';
import { RobotVersion, RobotStatus } from '../../models/Robot';

/// <reference types="jest" />

const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add routes - Note: robots routes include both simulation-based and direct robot routes
  app.use('/api/simulations', robotRoutes);
  app.use('/api', robotRoutes);

  // Error handler
  const errorHandler = (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && 'body' in err && (err as any).type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  };

  app.use(errorHandler as unknown as express.ErrorRequestHandler);

  return app;
};

describe('Robots API', () => {
  let pool: Pool;
  let testHelper: TestDataHelper;
  let testUser: { id: number; username: string; email: string };
  let testSimulation: any;
  let app: express.Application;

  beforeAll(async () => {
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    pool = testPool;
    testHelper = new TestDataHelper(pool);
    app = createTestApp();
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

  describe('POST /api/simulations/:simulationId/robots', () => {
    it('should create a new robot with valid data', async () => {
      const robotData = {
        name: 'Test Robot API',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0,
        battery_level: 100
      };

      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send(robotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('Test Robot API');
      expect(response.body.data.version).toBe(RobotVersion.V1);
      expect(response.body.data.x_position).toBe(0);
      expect(response.body.data.y_position).toBe(0);
      expect(response.body.data.battery_level).toBe(100);
      expect(response.body.data.status).toBe(RobotStatus.IDLE);
      expect(response.body.data.capabilities).toBeDefined();
      expect(response.body.data.capabilities.taskSpeedMultiplier).toBe(1.0);
      expect(response.body.message).toBe('Robot created successfully');
    });

    it('should create robot with different versions and correct capabilities', async () => {
      const v2RobotData = {
        name: 'V2 Robot',
        version: RobotVersion.V2,
        x_position: 1,
        y_position: 1,
        battery_level: 150
      };

      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send(v2RobotData)
        .expect(201);

      expect(response.body.data.version).toBe(RobotVersion.V2);
      expect(response.body.data.battery_level).toBe(150);
      expect(response.body.data.capabilities.taskSpeedMultiplier).toBe(1.5);
      expect(response.body.data.capabilities.batteryCapacity).toBe(150);
      expect(response.body.data.capabilities.chargeSpeedMultiplier).toBe(1.3);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Incomplete Robot'
          // Missing version, x_position, y_position
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid robot version', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Invalid Version Robot',
          version: 'V99', // Invalid version
          x_position: 0,
          y_position: 0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for position outside grid bounds', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Out of Bounds Robot',
          version: RobotVersion.V1,
          x_position: 25, // Outside 20x20 grid
          y_position: 0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('grid bounds');
    });

    it('should return 400 for invalid battery level', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Invalid Battery Robot',
          version: RobotVersion.V1,
          x_position: 0,
          y_position: 0,
          battery_level: 150 // Too high for V1 (max 100)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Battery level must be between 0 and 100 for V1');
    });

    it('should return 404 for non-existent simulation', async () => {
      const response = await request(app)
        .post('/api/simulations/99999/robots')
        .send({
          name: 'Robot for Missing Simulation',
          version: RobotVersion.V1,
          x_position: 0,
          y_position: 0
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Simulation not found');
    });

    it('should set default battery level to max capacity if not provided', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Default Battery Robot',
          version: RobotVersion.V2,
          x_position: 0,
          y_position: 0
          // No battery_level provided - should default to V2 max (150)
        })
        .expect(201);

      expect(response.body.data.battery_level).toBe(150); // V2 max capacity
    });
  });

  describe('GET /api/simulations/:simulationId/robots', () => {
    beforeEach(async () => {
      // Create test robots
      await testHelper.createMultipleRobots(testSimulation.id, 15);
    });

    it('should return paginated robots for simulation', async () => {
      const response = await request(app)
        .get(`/api/simulations/${testSimulation.id}/robots?page=1&limit=5`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(5);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.total).toBe(15);
      expect(response.body.pagination.totalPages).toBe(3);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrev).toBe(false);

      // Check that each robot has capabilities
      response.body.data.forEach((robot: any) => {
        expect(robot.capabilities).toBeDefined();
        expect(robot.capabilities.taskSpeedMultiplier).toBeDefined();
        expect(robot.capabilities.batteryCapacity).toBeDefined();
        expect(robot.capabilities.chargeSpeedMultiplier).toBeDefined();
      });
    });

    it('should return robots with default pagination', async () => {
      const response = await request(app)
        .get(`/api/simulations/${testSimulation.id}/robots`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(10); // Default limit
      expect(response.body.pagination.page).toBe(1); // Default page
    });

    it('should return 404 for non-existent simulation', async () => {
      const response = await request(app)
        .get('/api/simulations/99999/robots')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Simulation not found');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/simulations/${testSimulation.id}/robots?page=-1&limit=150`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/robots/:id', () => {
    it('should return robot by valid ID', async () => {
      const created = await testHelper.createTestRobot(testSimulation.id, {
        name: 'Specific Robot',
        version: RobotVersion.V3
      });

      const response = await request(app)
        .get(`/api/robots/${created.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(created.id);
      expect(response.body.data.name).toBe('Specific Robot');
      expect(response.body.data.version).toBe(RobotVersion.V3);
      expect(response.body.data.capabilities).toBeDefined();
      expect(response.body.data.capabilities.taskSpeedMultiplier).toBe(2.0);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/robots/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Robot not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/robots/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/robots/:id', () => {
    let testRobot: any;

    beforeEach(async () => {
      testRobot = await testHelper.createTestRobot(testSimulation.id, {
        name: 'Original Robot',
        version: RobotVersion.V1,
        x_position: 5,
        y_position: 5,
        battery_level: 80
      });
    });

    it('should update robot with valid data', async () => {
      const updateData = {
        name: 'Updated Robot',
        x_position: 10,
        y_position: 12,
        status: RobotStatus.MOVING
      };

      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Robot');
      expect(response.body.data.x_position).toBe(10);
      expect(response.body.data.y_position).toBe(12);
      expect(response.body.data.status).toBe(RobotStatus.MOVING);
      expect(response.body.data.version).toBe(RobotVersion.V1); // Unchanged
      expect(response.body.data.capabilities).toBeDefined();
    });

    it('should update robot version and adjust battery capacity', async () => {
      const updateData = {
        version: RobotVersion.V2,
        battery_level: 130
      };

      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(RobotVersion.V2);
      expect(response.body.data.battery_level).toBe(130);
      expect(response.body.data.capabilities.batteryCapacity).toBe(150);
    });

    it('should return 400 when no fields provided for update', async () => {
      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent robot', async () => {
      const response = await request(app)
        .put('/api/robots/99999')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Robot not found');
    });

    it('should return 400 for position outside grid bounds', async () => {
      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send({
          x_position: 25, // Outside 20x20 grid
          y_position: 5
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('grid bounds');
    });

    it('should return 400 for invalid battery level with version', async () => {
      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send({
          battery_level: 120 // Too high for V1 (max 100)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Battery level must be between 0 and 100 for V1');
    });

    it('should return 400 when updating only one coordinate', async () => {
      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send({
          x_position: 15
          // Missing y_position
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/robots/${testRobot.id}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/robots/:id', () => {
    let testRobot: any;

    beforeEach(async () => {
      testRobot = await testHelper.createTestRobot(testSimulation.id);
    });

    it('should delete existing robot', async () => {
      const response = await request(app)
        .delete(`/api/robots/${testRobot.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Robot deleted successfully');

      // Verify deletion
      await request(app)
        .get(`/api/robots/${testRobot.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent robot', async () => {
      const response = await request(app)
        .delete('/api/robots/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Robot not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/robots/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/robots/capabilities/:version', () => {
    it('should return capabilities for V1', async () => {
      const response = await request(app)
        .get('/api/robots/capabilities/V1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('V1');
      expect(response.body.data.capabilities).toEqual({
        taskSpeedMultiplier: 1.0,
        batteryCapacity: 100,
        chargeSpeedMultiplier: 1.0
      });
    });

    it('should return capabilities for V2', async () => {
      const response = await request(app)
        .get('/api/robots/capabilities/V2')
        .expect(200);

      expect(response.body.data.capabilities).toEqual({
        taskSpeedMultiplier: 1.5,
        batteryCapacity: 150,
        chargeSpeedMultiplier: 1.3
      });
    });

    it('should return capabilities for V3', async () => {
      const response = await request(app)
        .get('/api/robots/capabilities/V3')
        .expect(200);

      expect(response.body.data.capabilities).toEqual({
        taskSpeedMultiplier: 2.0,
        batteryCapacity: 200,
        chargeSpeedMultiplier: 1.5
      });
    });

    it('should return 400 for invalid robot version', async () => {
      const response = await request(app)
        .get('/api/robots/capabilities/V99')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid robot version');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle cascade delete when simulation is deleted', async () => {
      const robot = await testHelper.createTestRobot(testSimulation.id);

      // Delete the simulation (should cascade delete robots)
      await pool.query('DELETE FROM simulations WHERE id = $1', [testSimulation.id]);

      // Robot should no longer exist
      const response = await request(app)
        .get(`/api/robots/${robot.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Robot not found');
    });

    it('should validate robot name with special characters', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Robot<script>alert("xss")</script>',
          version: RobotVersion.V1,
          x_position: 0,
          y_position: 0
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate color format', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Colorful Robot',
          version: RobotVersion.V1,
          x_position: 0,
          y_position: 0,
          color: 'invalid-color'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should accept valid hex color', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({
          name: 'Colorful Robot',
          version: RobotVersion.V1,
          x_position: 0,
          y_position: 0,
          color: '#FF5733'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.color).toBe('#FF5733');
    });

    it('should maintain consistent response format for success', async () => {
      const robotData = {
        name: 'Format Test Robot',
        version: RobotVersion.V1,
        x_position: 0,
        y_position: 0
      };

      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send(robotData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);
      expect(typeof response.body.message).toBe('string');
      expect(response.body.data.capabilities).toBeDefined();
    });

    it('should maintain consistent response format for errors', async () => {
      const response = await request(app)
        .post(`/api/simulations/${testSimulation.id}/robots`)
        .send({}) // Empty data to trigger validation errors
        .expect(400);

      // Check error response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.message).toBe('string');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});