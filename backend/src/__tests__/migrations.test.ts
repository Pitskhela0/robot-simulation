// backend/src/__tests__/migrations.test.ts

import { Pool } from 'pg';
import { MigrationRunner } from '../db/migrate';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, dropAllTables, testPool } from '../db/test-setup';

describe('Migration Tests', () => {
  let pool: Pool;
  let migrationRunner: MigrationRunner;

  beforeAll(async () => {
    pool = testPool;
    migrationRunner = new MigrationRunner(pool);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    // Drop all tables completely to start fresh for each test
    await pool.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
  });

  it('should create migrations table', async () => {
    await migrationRunner.createMigrationsTable();
    
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'migrations'
    `);
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].table_name).toBe('migrations');
  });

  it('should run migrations successfully', async () => {
    await migrationRunner.runMigrations();
    
    // Check that all expected tables were created
    const expectedTables = ['users', 'simulations', 'robots', 'tasks', 'walls', 'statistics', 'migrations'];
    
    for (const tableName of expectedTables) {
      const result = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].table_name).toBe(tableName);
    }
  });

  it('should not run migrations twice', async () => {
    // Run migrations first time
    await migrationRunner.runMigrations();
    
    // Check migrations table
    const firstResult = await pool.query('SELECT COUNT(*) as count FROM migrations');
    const firstCount = parseInt(firstResult.rows[0].count);
    
    // Run migrations second time
    await migrationRunner.runMigrations();
    
    // Check that no additional migrations were run
    const secondResult = await pool.query('SELECT COUNT(*) as count FROM migrations');
    const secondCount = parseInt(secondResult.rows[0].count);
    
    expect(secondCount).toBe(firstCount);
  });

  it('should validate table structures', async () => {
    await migrationRunner.runMigrations();
    
    // Test users table structure
    const usersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    const expectedUsersColumns = ['id', 'username', 'email', 'password_hash', 'created_at', 'updated_at'];
    const actualUsersColumns = usersColumns.rows.map(row => row.column_name);
    
    expectedUsersColumns.forEach(col => {
      expect(actualUsersColumns).toContain(col);
    });
    
    // Test simulations table structure
    const simulationsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'simulations' AND table_schema = 'public'
    `);
    
    const expectedSimulationsColumns = ['id', 'user_id', 'name', 'description', 'grid_width', 'grid_height', 'status'];
    const actualSimulationsColumns = simulationsColumns.rows.map(row => row.column_name);
    
    expectedSimulationsColumns.forEach(col => {
      expect(actualSimulationsColumns).toContain(col);
    });
  });

  it('should create proper foreign key relationships', async () => {
    await migrationRunner.runMigrations();
    
    // Test foreign key constraints
    const foreignKeys = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `);
    
    expect(foreignKeys.rows.length).toBeGreaterThan(0);
    
    // Check specific foreign key relationships
    const simulationsUserFK = foreignKeys.rows.find(
      row => row.table_name === 'simulations' && row.column_name === 'user_id'
    );
    expect(simulationsUserFK).toBeDefined();
    expect(simulationsUserFK?.foreign_table_name).toBe('users');
  });

  it('should create indexes', async () => {
    await migrationRunner.runMigrations();
    
    // Check that indexes were created
    const indexes = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
    `);
    
    expect(indexes.rows.length).toBeGreaterThan(0);
    
    // Check for specific indexes
    const indexNames = indexes.rows.map(row => row.indexname);
    expect(indexNames).toContain('idx_simulations_user_id');
    expect(indexNames).toContain('idx_robots_simulation_id');
  });
});