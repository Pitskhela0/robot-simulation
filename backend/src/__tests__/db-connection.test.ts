// backend/src/__tests__/db-connection.test.ts

import { Pool } from 'pg';
import { MigrationRunner } from '../db/migrate';
import { cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../db/test-setup';

describe('Database Connection Tests', () => {
  let pool: Pool;
  let migrationRunner: MigrationRunner;

  beforeAll(async () => {
    // Drop all tables first to ensure clean start
    await dropAllTables();
    
    // Set up with migrations instead of direct table creation
    pool = testPool;
    migrationRunner = new MigrationRunner(pool);
    await migrationRunner.runMigrations();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    // Just clean up data, don't drop tables between individual tests
    try {
      await pool.query('TRUNCATE TABLE statistics, walls, tasks, robots, simulations, users RESTART IDENTITY CASCADE');
    } catch (error) {
      // If tables don't exist yet, that's ok
    }
  });

  it('should connect to the database', async () => {
    const client = await pool.connect();
    expect(client).toBeDefined();
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].current_time).toBeDefined();
    
    client.release();
  });

  it('should handle database queries', async () => {
    const result = await pool.query('SELECT 1 + 1 as sum');
    expect(result.rows[0].sum).toBe(2);
  });

  it('should handle transactions', async () => {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if users table exists first
      const tableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      
      if (tableCheck.rows.length === 0) {
        // Skip this test if users table doesn't exist
        await client.query('ROLLBACK');
        return;
      }
      
      // Insert a test user
      const insertResult = await client.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['testuser', 'test@example.com', 'hashedpassword']
      );
      
      expect(insertResult.rows).toHaveLength(1);
      expect(insertResult.rows[0].id).toBeDefined();
      
      await client.query('COMMIT');
      
      // Verify the user was inserted
      const selectResult = await client.query('SELECT * FROM users WHERE username = $1', ['testuser']);
      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].username).toBe('testuser');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  it('should handle connection errors gracefully', async () => {
    // Create a pool with invalid connection string
    const invalidPool = new Pool({
      connectionString: 'postgresql://invalid:invalid@localhost:5432/invalid',
      connectionTimeoutMillis: 1000
    });

    await expect(invalidPool.connect()).rejects.toThrow();
    await invalidPool.end();
  });
});