// backend/migrate-pg-config.js

// This file configures node-pg-migrate
// It uses environment variables to connect to the correct database

// We need dotenv to load the correct .env file (development vs. test)
require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

// The DATABASE_URL is all node-pg-migrate needs to connect
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

module.exports = {
  // Connection string for the database
  connectionString,

  migrationsTable: 'pgmigrations',
  'migration-file-language': 'ts', 
  dir: 'src/migrations',          

  // Other options
  decamelize: true, 
};