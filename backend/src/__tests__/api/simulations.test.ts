// backend/src/__tests__/api/simulations.test.ts

import request from 'supertest';
import { Pool } from 'pg';
import express from 'express';
import cors from 'cors';
import simulationRoutes from '../../routes/simulation';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../../db/test-setup';
import { MigrationRunner } from '../../db/migrate';
import { TestDataHelper } from '../helpers/testData';

/// <reference types="jest" />

const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add routes
  app.use('/api/simulations', simulationRoutes);

  // 404 handler
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  });

  // Error handler that properly handles JSON parsing errors
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

  // ✅ TypeScript-compliant and Express-safe
  app.use(errorHandler as unknown as express.ErrorRequestHandler);

  return app;
};

describe('Simulations API', () => {
  let pool: Pool;
  let testHelper: TestDataHelper;
  let testUser: { id: number; username: string; email: string };
  let app: express.Application;

  beforeAll(async () => {
    await dropAllTables();
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    pool = testPool;
    testHelper = new TestDataHelper(pool);
    app = createTestApp(); // Create test app here
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await testHelper.cleanupTestData();
    testUser = await testHelper.createTestUser();
  });

  describe('POST /api/simulations', () => {
    it('should create a new simulation with valid data', async () => {
      const simulationData = {
        user_id: testUser.id,
        name: 'Test Simulation API',
        description: 'API test simulation',
        grid_width: 25,
        grid_height: 30
      };

      const response = await request(app)
        .post('/api/simulations')
        .send(simulationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe('Test Simulation API');
      expect(response.body.data.grid_width).toBe(25);
      expect(response.body.data.grid_height).toBe(30);
      expect(response.body.data.status).toBe('created');
      expect(response.body.message).toBe('Simulation created successfully');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send({
          name: 'Incomplete Simulation'
          // Missing user_id, grid_width, grid_height
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid grid dimensions', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send({
          user_id: testUser.id,
          name: 'Invalid Grid',
          grid_width: 3, // Too small
          grid_height: 150 // Too large
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid user_id', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send({
          user_id: 99999, // Non-existent user
          name: 'Invalid User Test',
          grid_width: 10,
          grid_height: 10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID. User does not exist.');
    });

    it('should return 400 for invalid name format', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send({
          user_id: testUser.id,
          name: 'Invalid@Name!', // Contains invalid characters
          grid_width: 10,
          grid_height: 10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/simulations', () => {
    beforeEach(async () => {
      // Create test simulations
      await testHelper.createMultipleSimulations(testUser.id, 15);
    });

    it('should return paginated simulations', async () => {
      const response = await request(app)
        .get('/api/simulations?page=1&limit=5')
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
    });

    it('should return simulations with default pagination', async () => {
      const response = await request(app)
        .get('/api/simulations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBe(10); // Default limit
      expect(response.body.pagination.page).toBe(1); // Default page
    });

    it('should filter simulations by user_id', async () => {
      const otherUser = await testHelper.createTestUser({ 
        username: 'other', 
        email: 'other@example.com' 
      });
      await testHelper.createMultipleSimulations(otherUser.id, 5);

      const response = await request(app)
        .get(`/api/simulations?user_id=${testUser.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination.total).toBe(15); // Only testUser's simulations
      response.body.data.forEach((sim: any) => {
        expect(sim.user_id).toBe(testUser.id);
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/simulations?page=-1&limit=150')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/simulations/stats', () => {
    beforeEach(async () => {
      // Create simulations with different statuses
      await testHelper.createTestSimulation(testUser.id, { status: 'created' });
      await testHelper.createTestSimulation(testUser.id, { status: 'created' });
      await testHelper.createTestSimulation(testUser.id, { status: 'running' });
      await testHelper.createTestSimulation(testUser.id, { status: 'completed' });
      await testHelper.createTestSimulation(testUser.id, { status: 'failed' });
    });

    it('should return simulation statistics', async () => {
      const response = await request(app)
        .get('/api/simulations/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.created).toBe(2);
      expect(response.body.data.running).toBe(1);
      expect(response.body.data.completed).toBe(1);
      expect(response.body.data.failed).toBe(1);
      expect(response.body.data.paused).toBe(0);
      expect(response.body.data.total).toBe(5);
    });
  });

  describe('GET /api/simulations/:id', () => {
    it('should return simulation by valid ID', async () => {
      const created = await testHelper.createTestSimulation(testUser.id, {
        name: 'Specific Simulation',
        description: 'A specific test simulation'
      });

      const response = await request(app)
        .get(`/api/simulations/${created.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(created.id);
      expect(response.body.data.name).toBe('Specific Simulation');
      expect(response.body.data.description).toBe('A specific test simulation');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/simulations/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Simulation not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/simulations/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/simulations/:id', () => {
    let testSimulation: any;

    beforeEach(async () => {
      testSimulation = await testHelper.createTestSimulation(testUser.id, {
        name: 'Original Name',
        description: 'Original description',
        grid_width: 20,
        grid_height: 20
      });
    });

    it('should update simulation with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        status: 'running'
      };

      const response = await request(app)
        .put(`/api/simulations/${testSimulation.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.status).toBe('running');
      expect(response.body.data.grid_width).toBe(20); // Unchanged
      expect(response.body.data.grid_height).toBe(20); // Unchanged
    });

    it('should update grid dimensions', async () => {
      const updateData = {
        grid_width: 50,
        grid_height: 60
      };

      const response = await request(app)
        .put(`/api/simulations/${testSimulation.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grid_width).toBe(50);
      expect(response.body.data.grid_height).toBe(60);
    });

    it('should return 400 when no fields provided for update', async () => {
      const response = await request(app)
        .put(`/api/simulations/${testSimulation.id}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent simulation', async () => {
      const response = await request(app)
        .put('/api/simulations/99999')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Simulation not found');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/simulations/${testSimulation.id}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid grid dimensions', async () => {
      const response = await request(app)
        .put(`/api/simulations/${testSimulation.id}`)
        .send({
          grid_width: 3, // Too small
          grid_height: 150 // Too large
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when updating only one grid dimension', async () => {
      const response = await request(app)
        .put(`/api/simulations/${testSimulation.id}`)
        .send({
          grid_width: 30
          // Missing grid_height
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('DELETE /api/simulations/:id', () => {
    let testSimulation: any;

    beforeEach(async () => {
      testSimulation = await testHelper.createTestSimulation(testUser.id);
    });

    it('should delete existing simulation', async () => {
      const response = await request(app)
        .delete(`/api/simulations/${testSimulation.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Simulation deleted successfully');

      // Verify deletion
      await request(app)
        .get(`/api/simulations/${testSimulation.id}`)
        .expect(404);
    });

    it('should return 404 for non-existent simulation', async () => {
      const response = await request(app)
        .delete('/api/simulations/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Simulation not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/simulations/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/simulations/nonexistent/route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Route');
      expect(response.body.message).toContain('not found');
    });

    it('should handle large pagination requests', async () => {
      const response = await request(app)
        .get('/api/simulations?page=1&limit=101') // Above max limit
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle zero and negative page numbers', async () => {
      const response = await request(app)
        .get('/api/simulations?page=0&limit=10')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate simulation name with special characters', async () => {
      const response = await request(app)
        .post('/api/simulations')
        .send({
          user_id: testUser.id,
          name: 'Test<script>alert("xss")</script>',
          grid_width: 10,
          grid_height: 10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle extremely long descriptions', async () => {
      const longDescription = 'a'.repeat(1001); // Exceeds max length

      const response = await request(app)
        .post('/api/simulations')
        .send({
          user_id: testUser.id,
          name: 'Long Description Test',
          description: longDescription,
          grid_width: 10,
          grid_height: 10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should maintain consistent response format for success', async () => {
      const simulationData = {
        user_id: testUser.id,
        name: 'Format Test',
        grid_width: 10,
        grid_height: 10
      };

      const response = await request(app)
        .post('/api/simulations')
        .send(simulationData)
        .expect(201);

      // Check response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);
      expect(typeof response.body.message).toBe('string');
    });

    it('should maintain consistent response format for errors', async () => {
      const response = await request(app)
        .post('/api/simulations')
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