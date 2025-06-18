// backend/src/db/test-setup.ts - Updated version

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
    
    // Drop all tables and recreate schema
    await dropAllTables();
    
    // Run migrations to create tables
    const migrationRunner = new MigrationRunner(testPool);
    await migrationRunner.runMigrations();
    
    console.log('Test database setup completed');
    return testPool;
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
}

// Clean up test database - only truncate data, keep tables
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Get list of tables that actually exist
    const result = await testPool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT IN ('migrations')
      ORDER BY tablename
    `);
    
    const existingTables = result.rows.map(row => row.tablename);
    
    if (existingTables.length > 0) {
      // Only truncate tables that exist, in correct order to handle foreign keys
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

// Drop all tables AND sequences (for fresh start)
export async function dropAllTables(): Promise<void> {
  try {
    // First drop all tables (this will cascade and drop sequences)
    await testPool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('Schema recreated (all tables and sequences dropped)');
  } catch (error) {
    console.error('Failed to recreate schema:', error);
    throw error; // This should fail if we can't set up the test environment
  }
}

// Close test database connection
export async function closeTestDatabase(): Promise<void> {
  await testPool.end();
  console.log('Test database connection closed');
}

export { testPool };