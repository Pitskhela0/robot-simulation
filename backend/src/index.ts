// backend/src/index.ts

import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { pool } from './db';

// Import your new route module
import healthRoutes from './api/routes/health';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ROUTES ---
// This is the clean, scalable way to add routes.
// It tells Express: "For any request to '/api/health', use the healthRoutes router."
app.use('/api/health', healthRoutes);

// You will add more routes here later, e.g.:
// app.use('/api/simulations', simulationRoutes);
// app.use('/api/robots', robotRoutes);

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  server.close(async () => {
    await pool.end();
    console.log('Database pool and server closed.');
    process.exit(0);
  });
});

// Export app for testing
export default app;