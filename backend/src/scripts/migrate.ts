// backend/src/scripts/migrate.ts

import { pool } from '../db';
import { runMigrationsFromCLI } from '../db/migrate';

async function main() {
  console.log('Starting migration process...');
  
  try {
    await runMigrationsFromCLI(pool);
    console.log('✓ Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration process failed:', error);
    process.exit(1);
  } finally {
    // Ensure the database connection is closed
    await pool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}