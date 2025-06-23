import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { pool } from './db';
import simulationRoutes from './routes/simulation'; // Fixed path
import robotRoutes from './routes/robots';
import taskRoutes from './routes/tasks';
import wallRoutes from './routes/walls';
import healthRoutes from './api/routes/health'; // Keep the health route
import { Request, Response, NextFunction } from 'express';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Add basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic root route
app.get('/', (_req, res) => {
  res.send('Robot Simulation API is working!');
});

// Health check endpoint from separate health routes
app.use('/api/health', healthRoutes);

// API Routes - mount them correctly
app.use('/api/simulations', simulationRoutes);
app.use('/api/simulations', robotRoutes); // For simulation-based robot routes
app.use('/api', robotRoutes); // For direct robot routes (/api/robots/:id)
app.use('/api/simulations', taskRoutes); // For simulation-based task routes
app.use('/api', taskRoutes); // For direct task routes (/api/tasks/:id)
app.use('/api/simulations', wallRoutes); // For simulation-based wall routes
app.use('/api', wallRoutes); // For direct wall routes (/api/walls/:id)

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
    await pool.end();
    console.log('Database pool closed.');
    process.exit(0);
  });
}

export default app;