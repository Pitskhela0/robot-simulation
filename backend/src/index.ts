// backend/src/index.ts

import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { pool } from './db'; // Import the database pool from your db module

// Load environment variables from .env file
// Use path.resolve relative to the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
// Use the PORT from environment variables with a fallback
const PORT = process.env.PORT || 5000;

// Add basic middleware
app.use(cors()); // Enable CORS (configure origin restriction for production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Basic root route (Optional, good for testing server is live)
app.get('/', (_req, res) => {
  res.send('API is working!');
});

// Health check endpoint (Step 4 - checks server and database connection)
app.get('/api/health', async (_req, res) => {
    let client; // Declare client outside try for finally block access
    try {
        // Attempt to get a client from the pool and run a simple query
        client = await pool.connect();
        await client.query('SELECT 1'); // A fast query to check connection status
        // client.release(); // Release is now in finally

        res.status(200).json({ status: 'ok', server: 'running', database: 'connected' });
    } catch (err) {
        console.error('Health check database connection failed:', err);

        // Handle the unknown error type safely
        const error = err instanceof Error ? err : new Error(String(err));

        res.status(500).json({
            status: 'error',
            server: 'running',
            database: 'disconnected',
            error: error.message // Use the safely accessed message
        });
    } finally {
        // Ensure client is released back to the pool
        if (client) {
            client.release();
            console.log('Health check: Database client released.');
        }
    }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});

// Optional: Handle graceful server and database pool shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  // Close the database pool connections gracefully
  await pool.end();
  console.log('Database pool closed.');
  process.exit(0); // Exit cleanly
});

// Export app for testing purposes later if needed (optional for now)
// export default app;