// backend/src/__tests__/setup.ts

import dotenv from 'dotenv';
import path from 'path';

// Set test environment first
process.env.NODE_ENV = 'test';

// Load test environment variables - try both .env.test and .env
const envTestPath = path.resolve(__dirname, '../../.env.test');
const envPath = path.resolve(__dirname, '../../.env');

// Try to load .env.test first, then fallback to .env
const testEnvResult = dotenv.config({ path: envTestPath });
if (testEnvResult.error) {
  console.log('No .env.test file found, using .env');
  dotenv.config({ path: envPath });
}

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  console.log('✅ Test suite completed');
});