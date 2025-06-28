// backend/src/index.ts - Updated with WebSocket integration
import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { pool } from './db';
import simulationRoutes from './routes/simulation';
import robotRoutes from './routes/robots';
import taskRoutes from './routes/tasks';
import wallRoutes from './routes/walls';
import healthRoutes from './api/routes/health';
import SocketServer from './websocket/socketServer';
import { Request, Response, NextFunction } from 'express';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server (required for Socket.IO)
const httpServer = createServer(app);

// Add basic middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WebSocket server
const socketServer = new SocketServer(httpServer, pool);

// Make socket server available to routes via middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).socketServer = socketServer;
  next();
});

// Basic root route
app.get('/', (_req, res) => {
  const stats = socketServer.getConnectionStats();
  res.json({
    message: 'Robot Simulation API is working!',
    websocket: {
      connected: true,
      totalConnections: stats.totalConnections,
      activeSimulations: stats.simulationRooms
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.use('/api/health', healthRoutes);

// WebSocket status endpoint
app.get('/api/websocket/status', (_req, res) => {
  const stats = socketServer.getConnectionStats();
  res.json({
    status: 'operational',
    connections: stats.totalConnections,
    simulationRooms: stats.simulationRooms,
    timestamp: new Date().toISOString()
  });
});

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
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 WebSocket server ready for connections`);
    console.log(`📋 Health check available at http://localhost:${PORT}/api/health`);
    console.log(`🤖 Simulations API available at http://localhost:${PORT}/api/simulations`);
    console.log(`📊 WebSocket status at http://localhost:${PORT}/api/websocket/status`);
  });

  // Handle graceful server and database pool shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    try {
      // Close HTTP server
      httpServer.close(() => {
        console.log('📡 HTTP server closed');
      });

      // Close database pool
      await pool.end();
      console.log('🗄️ Database pool closed');

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// Export both app and socketServer for testing
export { app as default, socketServer };