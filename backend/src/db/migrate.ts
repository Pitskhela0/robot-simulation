// backend/src/db/migrate.ts

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  filename: string;
  sql: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  // Create migrations table if it doesn't exist
  async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.pool.query(createTableSQL);
    console.log('Migrations table ready');
  }

  // Get all migration files from the migrations directory
  private async getMigrationFiles(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order

    const migrations: Migration[] = [];

    for (const filename of files) {
      const filePath = path.join(this.migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      const id = filename.replace('.sql', '');
      
      migrations.push({ id, filename, sql });
    }

    return migrations;
  }

  // Get executed migrations from database
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.pool.query('SELECT id FROM migrations ORDER BY executed_at');
      return result.rows.map(row => row.id);
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      if (error instanceof Error && error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
  }

  // Run pending migrations
  async runMigrations(): Promise<void> {
    await this.createMigrationsTable();

    const allMigrations = await this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Debug: Log the SQL content
        console.log(`📝 Executing migration: ${migration.filename}`);
        console.log(`📝 SQL length: ${migration.sql.length} characters`);
        console.log(`📝 First 200 chars: ${migration.sql.substring(0, 200)}`);
        console.log(`📝 Last 200 chars: ${migration.sql.substring(migration.sql.length - 200)}`);
        
        // Execute the migration SQL
        await client.query(migration.sql);
        
        // Record the migration as executed
        await client.query(
          'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
          [migration.id, migration.filename]
        );
        
        await client.query('COMMIT');
        console.log(`✓ Executed migration: ${migration.filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`✗ Failed to execute migration: ${migration.filename}`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('All migrations completed successfully');
  }

  // Rollback last migration (optional feature)
  async rollbackLastMigration(): Promise<void> {
    const result = await this.pool.query(
      'SELECT id, filename FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0];
    console.log(`Rolling back migration: ${lastMigration.filename}`);

    // Note: This is a basic implementation. In practice, you'd need rollback SQL files
    await this.pool.query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
    console.log(`✓ Rolled back migration: ${lastMigration.filename}`);
  }
}

// CLI functionality for running migrations
export async function runMigrationsFromCLI(pool: Pool): Promise<void> {
  const runner = new MigrationRunner(pool);
  
  try {
    await runner.runMigrations();
    console.log('Migration process completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}