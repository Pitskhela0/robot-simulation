// backend/src/db/index.ts

import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded (robust check)
// Use path.resolve relative to the project root (which is the parent of 'backend')
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Check if DATABASE_URL is set BEFORE creating the pool
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('FATAL ERROR: DATABASE_URL is not set in environment variables. Please add it to backend/.env');
  // Exit immediately as the application cannot run without a database
  process.exit(1);
}

// Create a new connection pool
const pool = new Pool({
  connectionString: databaseUrl,
  // You might add other pool configuration options here
  // max: 20,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000,
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Example SSL config
});

// Optional: Add event listeners for logging pool events
pool.on('connect', client => {
  console.log('Database pool: New client connected');
  // client.query('SET search_path TO public'); // Example: set default schema
});

pool.on('acquire', client => {
    console.log('Database pool: Client acquired from pool');
});

pool.on('release', client => {
    console.log('Database pool: Client released back to pool');
});


pool.on('error', (err: Error, client) => { // Explicitly typing err as Error can help here
  console.error('Database pool: Unexpected error on idle client', err);
  // Critical error, exit the process
  process.exit(-1);
});

// --- Use async/await for the initial connection test (handles unknown error cleanly) ---
async function testDatabaseConnection() {
  let client;
  try {
    client = await pool.connect(); // Acquire a client
    const result: QueryResult = await client.query('SELECT NOW() as current_time'); // Run test query
    console.log('Database pool: Connection test successful, current time:', result.rows[0].current_time);
  } catch (err) {
    // Handle the error safely
    console.error('Database pool: Connection test failed:', err);
    if (err instanceof Error) {
      console.error('Database pool: Error details:', err.message);
    } else {
       console.error('Database pool: An unknown error occurred during connection test.');
    }
    // Decide if you want to exit here if the initial connection fails
    // process.exit(1); // Uncomment if you want the app to fail fast
  } finally {
    // Always release the client
    if (client) {
      client.release();
      console.log('Database pool: Client released after test.');
    }
  }
}

// Run the test function immediately when this module is imported
testDatabaseConnection();
// --- End async/await test ---

// Export the pool so index.ts (and other files) can use it
export { pool };