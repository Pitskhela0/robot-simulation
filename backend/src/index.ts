import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { pool } from './db'; // Import the database pool from your db module
import simulationRoutes from './routes/simulation';
import { Request, Response, NextFunction } from 'express';
import robotRoutes from './routes/robots';



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
app.use('/api/simulations', robotRoutes); // For simulation-based robot routes
app.use('/api', robotRoutes); // For direct robot routes


// Basic root route (Optional, good for testing server is live)
app.get('/', (_req, res) => {
  res.send('Robot Simulation API is working!');
});

// Health check endpoint (Step 4 - checks server and database connection)
app.get('/api/health', async (_req, res) => {
    let client; // Declare client outside try for finally block access
    try {
        // Attempt to get a client from the pool and run a simple query
        client = await pool.connect();
        await client.query('SELECT 1'); // A fast query to check connection status

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

// API Routes
app.use('/api/simulations', simulationRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof SyntaxError && 'body' in err && (err as any).type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
    });
  }

  console.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

app.use(errorHandler as unknown as express.ErrorRequestHandler);


// Only start the server if this file is run directly (not imported in tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
    console.log(`Simulations API available at http://localhost:${PORT}/api/simulations`);
  });

  // Optional: Handle graceful server and database pool shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    // Close the database pool connections gracefully
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0); // Exit cleanly
  });
}

// Export app for testing purposes
export default app;