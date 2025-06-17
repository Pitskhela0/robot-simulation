// backend/src/__tests__/api.test.ts

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { pool } from '../db';
import { MigrationRunner } from '../db/migrate';
import { cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../db/test-setup';

// Create test app (similar to your main app but for testing)
const createTestApp = () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root route
  app.get('/', (_req, res) => {
    res.send('API is working!');
  });

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    let client;
    try {
      client = await pool.connect();
      await client.query('SELECT 1');
      
      res.status(200).json({ 
        status: 'ok', 
        server: 'running', 
        database: 'connected' 
      });
    } catch (err) {
      console.error('Health check database connection failed:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      
      res.status(500).json({
        status: 'error',
        server: 'running',
        database: 'disconnected',
        error: error.message
      });
    } finally {
      if (client) {
        client.release();
      }
    }
  });

  return app;
};

describe('API Endpoint Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Drop all tables first to ensure clean start
    await dropAllTables();
    
    // Set up with migrations
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    app = createTestApp();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    // Clean up data but keep tables
    await cleanupTestDatabase();
  });

  describe('GET /', () => {
    it('should return API working message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.text).toBe('API is working!');
    });
  });

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toEqual({
        status: 'ok',
        server: 'running',
        database: 'connected'
      });
    });

    it('should return proper content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });

    it('should handle malformed JSON in request body', async () => {
      // Create a test endpoint that accepts JSON
      app.post('/api/test', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/api/test')
        .send('{"invalid": json}') // Malformed JSON
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Request parsing', () => {
    it('should parse JSON request bodies', async () => {
      // Add a test endpoint
      app.post('/api/echo', (req, res) => {
        res.json({ received: req.body });
      });

      const testData = { message: 'Hello, World!' };
      
      const response = await request(app)
        .post('/api/echo')
        .send(testData)
        .expect(200);
      
      expect(response.body.received).toEqual(testData);
    });

    it('should parse URL-encoded request bodies', async () => {
      app.post('/api/form', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/api/form')
        .send('name=test&value=123')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(200);
      
      expect(response.body.received).toEqual({ name: 'test', value: '123' });
    });
  });
});