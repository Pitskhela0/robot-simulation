// backend/src/__tests__/teardown.ts

import { pool } from '../db';

export default async function globalTeardown() {
  // Close the main database pool
  try {
    await pool.end();
    console.log('Main database pool closed');
  } catch (error) {
    console.log('Pool was already closed or error closing:', error);
  }
  
  // Give a moment for any remaining database connections to close
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('Global teardown completed');
}