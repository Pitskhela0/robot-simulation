// backend/src/websocket/socketServer.ts - Updated modular version

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Pool } from 'pg';
import { SocketHandlers } from './socketHandlers';
import { SocketMiddleware, eventValidators, createSocketMiddleware } from './socketMiddleware';

// Configuration interface
interface SocketServerConfig {
  cors?: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  };
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
    message?: string;
  };
  pingTimeout?: number;
  pingInterval?: number;
  enableAuth?: boolean;
  enableRateLimit?: boolean;
  enableValidation?: boolean;
}

export class SocketServer {
  private io: SocketIOServer;
  private pool: Pool;
  private handlers: SocketHandlers;
  private middleware: SocketMiddleware;
  private config: SocketServerConfig;
  private logger: (level: string, message: string, meta?: any) => void;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    httpServer: HttpServer, 
    pool: Pool, 
    config: SocketServerConfig = {},
    logger?: (level: string, message: string, meta?: any) => void
  ) {
    this.pool = pool;
    this.logger = logger || this.defaultLogger;
    this.config = this.mergeWithDefaults(config);
    
    // Initialize Socket.IO server
    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors,
      pingTimeout: this.config.pingTimeout,
      pingInterval: this.config.pingInterval,
      transports: ['websocket', 'polling']
    });

    // Initialize handlers and middleware
    this.handlers = new SocketHandlers(pool, this.logger);
    this.middleware = createSocketMiddleware(this.config.rateLimit, this.logger);

    // Setup middleware and event handlers
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupCleanupTasks();

    this.logger('info', 'Socket.IO server initialized', {
      cors: this.config.cors?.origin,
      rateLimit: this.config.rateLimit,
      authEnabled: this.config.enableAuth,
      rateLimitEnabled: this.config.enableRateLimit
    });
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SOCKET] [${level.toUpperCase()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  private mergeWithDefaults(config: SocketServerConfig): SocketServerConfig {
    return {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
        ...config.cors
      },
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100, // 100 requests per minute
        message: 'Too many requests from this client',
        ...config.rateLimit
      },
      pingTimeout: config.pingTimeout || 60000,
      pingInterval: config.pingInterval || 25000,
      enableAuth: config.enableAuth !== false, // Default to true
      enableRateLimit: config.enableRateLimit !== false, // Default to true
      enableValidation: config.enableValidation !== false, // Default to true
      ...config
    };
  }

  private setupMiddleware(): void {
    // Authentication middleware (if enabled)
    if (this.config.enableAuth) {
      this.io.use(this.middleware.authenticationMiddleware);
      this.logger('info', 'Authentication middleware enabled');
    }

    // Request validation middleware (if enabled)
    if (this.config.enableValidation) {
      this.io.use(this.middleware.validationMiddleware);
      this.logger('info', 'Validation middleware enabled');
    }

    // Rate limiting middleware (if enabled)
    if (this.config.enableRateLimit) {
      this.io.use(this.middleware.rateLimitMiddleware);
      this.logger('info', 'Rate limiting middleware enabled');
    }

    // Event-specific validation middleware
    this.io.use(this.middleware.createEventMiddleware('simulation:join', eventValidators.simulationJoin));
    this.io.use(this.middleware.createEventMiddleware('simulation:start', eventValidators.simulationControl));
    this.io.use(this.middleware.createEventMiddleware('simulation:pause', eventValidators.simulationControl));
    this.io.use(this.middleware.createEventMiddleware('simulation:reset', eventValidators.simulationControl));
    this.io.use(this.middleware.createEventMiddleware('robot:update', eventValidators.robotUpdate));
    this.io.use(this.middleware.createEventMiddleware('task:update', eventValidators.taskUpdate));
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      // Use the handlers class for all event management
      this.handlers.handleConnection(socket);

      // Setup error handling
      socket.on('error', (error) => {
        this.logger('error', 'Socket error', {
          socketId: socket.id,
          error: error.message || error
        });
      });

      // Setup heartbeat monitoring
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    // Global error handling
    this.io.engine.on('connection_error', (err) => {
      this.logger('error', 'Connection error', {
        code: err.code,
        message: err.message,
        context: err.context
      });
    });
  }

  private setupCleanupTasks(): void {
    // Clean up rate limit data every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.middleware.cleanupRateLimitData();
    }, 5 * 60 * 1000);

    this.logger('info', 'Cleanup tasks scheduled');
  }

  // Public broadcasting methods (for use by simulation engine)
  public broadcastRobotUpdate(data: {
    robotId: number;
    simulationId: number;
    x_position: number;
    y_position: number;
    battery_level: number;
    status: string;
    direction?: string;
  }): void {
    this.io.to(`simulation-${data.simulationId}`).emit('robot:position', {
      robotId: data.robotId,
      x_position: data.x_position,
      y_position: data.y_position,
      direction: data.direction || 'north',
      timestamp: new Date().toISOString()
    });

    this.io.to(`simulation-${data.simulationId}`).emit('robot:status', {
      robotId: data.robotId,
      status: data.status,
      battery_level: data.battery_level,
      timestamp: new Date().toISOString()
    });

    this.logger('debug', 'Robot update broadcasted', {
      robotId: data.robotId,
      simulationId: data.simulationId
    });
  }

  public broadcastTaskUpdate(data: {
    taskId: number;
    simulationId: number;
    status: string;
    robotId?: number;
    completedAt?: string;
  }): void {
    if (data.robotId && data.status === 'assigned') {
      this.io.to(`simulation-${data.simulationId}`).emit('task:assigned', {
        taskId: data.taskId,
        robotId: data.robotId,
        timestamp: new Date().toISOString()
      });
    } else if (data.status === 'completed' && data.robotId) {
      this.io.to(`simulation-${data.simulationId}`).emit('task:completed', {
        taskId: data.taskId,
        robotId: data.robotId,
        duration: data.completedAt ? this.calculateDuration(data.completedAt) : 0,
        timestamp: new Date().toISOString()
      });
    }

    this.logger('debug', 'Task update broadcasted', {
      taskId: data.taskId,
      simulationId: data.simulationId,
      status: data.status
    });
  }

  public broadcastBatteryAlert(data: {
    robotId: number;
    simulationId: number;
    battery_level: number;
    isCharging: boolean;
  }): void {
    if (data.battery_level <= 20 && !data.isCharging) {
      this.io.to(`simulation-${data.simulationId}`).emit('battery:low', {
        robotId: data.robotId,
        battery_level: data.battery_level,
        timestamp: new Date().toISOString()
      });

      this.logger('info', 'Battery alert broadcasted', {
        robotId: data.robotId,
        simulationId: data.simulationId,
        batteryLevel: data.battery_level
      });
    }
  }

  public broadcastSimulationUpdate(data: {
    simulationId: number;
    status: string;
    robots: any[];
    timestamp: string;
  }): void {
    this.io.to(`simulation-${data.simulationId}`).emit('simulation:update', data);
    
    this.logger('debug', 'Simulation update broadcasted', {
      simulationId: data.simulationId,
      status: data.status,
      robotCount: data.robots.length
    });
  }

  // Utility methods
  private calculateDuration(completedAt: string): number {
    return Math.floor((new Date().getTime() - new Date(completedAt).getTime()) / 1000);
  }

  // Public API methods
  public getConnectionStats(): {
    totalConnections: number;
    simulationRooms: Map<number, number>;
    rateLimitStats: { totalClients: number; averageRequests: number };
  } {
    const connectionStats = this.handlers.getConnectionStats();
    const rateLimitStats = this.middleware.getRateLimitStats();

    return {
      ...connectionStats,
      rateLimitStats
    };
  }

  public getConnectedClients(): Map<string, any> {
    return this.handlers.getConnectedClients();
  }

  public isClientInSimulation(socketId: string, simulationId: number): boolean {
    return this.handlers.isClientInSimulation(socketId, simulationId);
  }

  public updateRateLimitConfig(config: { windowMs?: number; maxRequests?: number; message?: string }): void {
    this.middleware.updateRateLimitConfig(config);
    
  }

  public getServerConfig(): SocketServerConfig {
    return { ...this.config };
  }

  // Health check method
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connections: number;
    uptime: number;
    lastError?: string;
  } {
    const stats = this.getConnectionStats();
    
    return {
      status: 'healthy', // You can implement more sophisticated health checks
      connections: stats.totalConnections,
      uptime: process.uptime(),
    };
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    this.logger('info', 'Starting socket server shutdown');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Notify all connected clients
    this.io.emit('server:shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.io.close();

    this.logger('info', 'Socket server shutdown completed');
  }

  // Get the Socket.IO instance (for advanced usage)
  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default SocketServer;