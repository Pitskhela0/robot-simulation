// backend/src/db/test-setup.ts

import { Pool } from 'pg';
import { MigrationRunner } from './migrate';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Create test database pool
const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  // Use smaller pool for tests
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Setup test database
export async function setupTestDatabase(): Promise<Pool> {
  try {
    console.log('Setting up test database...');
    
    // For now, let's create tables directly instead of using migrations
    await createTablesDirectly();
    
    console.log('Test database setup completed');
    return testPool;
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
}

// Create tables directly (bypass migration system for now)
async function createTablesDirectly(): Promise<void> {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS simulations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS robots (
        id SERIAL PRIMARY KEY,
        simulation_id INTEGER,
        name VARCHAR(100) NOT NULL,
        x_position INTEGER DEFAULT 0,
        y_position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        simulation_id INTEGER,
        robot_id INTEGER,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS walls (
        id SERIAL PRIMARY KEY,
        simulation_id INTEGER,
        x_position INTEGER NOT NULL,
        y_position INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        simulation_id INTEGER,
        robot_id INTEGER,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,2) NOT NULL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await testPool.query(createTablesSQL);
}

// Clean up test database - safer version that checks if tables exist
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Get list of tables that actually exist
    const result = await testPool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('statistics', 'walls', 'tasks', 'robots', 'simulations', 'users', 'migrations')
    `);
    
    const existingTables = result.rows.map(row => row.tablename);
    
    if (existingTables.length > 0) {
      // Only truncate tables that exist
      const cleanupSQL = `TRUNCATE TABLE ${existingTables.join(', ')} RESTART IDENTITY CASCADE;`;
      await testPool.query(cleanupSQL);
      console.log('Test database cleaned up');
    } else {
      console.log('No tables to clean up');
    }
  } catch (error) {
    console.error('Test database cleanup failed:', error);
    // Don't throw here - cleanup failure shouldn't fail tests
  }
}

// Drop all tables (for fresh start in migration tests)
export async function dropAllTables(): Promise<void> {
  try {
    const dropSQL = `
      DROP TABLE IF EXISTS statistics, walls, tasks, robots, simulations, users, migrations CASCADE;
    `;
    await testPool.query(dropSQL);
    console.log('All tables dropped');
  } catch (error) {
    console.error('Failed to drop tables:', error);
    // Don't throw - this is for cleanup
  }
}

// Close test database connection
export async function closeTestDatabase(): Promise<void> {
  await testPool.end();
  console.log('Test database connection closed');
}

export { testPool };