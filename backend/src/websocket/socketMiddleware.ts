// backend/src/websocket/socketMiddleware.ts

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// Client request tracking for rate limiting
interface ClientRequestData {
  requests: number[];
  lastRequest: number;
}

// Authentication data interface
interface AuthData {
  userId?: number;
  sessionId?: string;
  permissions?: string[];
}

export class SocketMiddleware {
  private rateLimitMap: Map<string, ClientRequestData> = new Map();
  private rateLimitConfig: RateLimitConfig;
  private logger: (level: string, message: string, meta?: any) => void;

  constructor(
    rateLimitConfig: RateLimitConfig = { windowMs: 60000, maxRequests: 100 },
    logger?: (level: string, message: string, meta?: any) => void
  ) {
    this.rateLimitConfig = rateLimitConfig;
    this.logger = logger || this.defaultLogger;
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [MIDDLEWARE] [${level.toUpperCase()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  // Basic authentication middleware
  public authenticationMiddleware = (socket: Socket, next: (err?: ExtendedError) => void): void => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const sessionId = socket.handshake.auth?.sessionId;

      // For now, we'll implement basic session validation
      // In production, you'd validate JWT tokens or session cookies
      if (this.isValidSession(token, sessionId)) {
        // Store authentication data in socket for later use
        const authData: AuthData = this.extractAuthData(token, sessionId);
        (socket as any).authData = authData;

        this.logger('info', 'Client authenticated successfully', {
          socketId: socket.id,
          userId: authData.userId,
          sessionId: authData.sessionId
        });

        next();
      } else {
        const error = new Error('Authentication failed') as ExtendedError;
        error.data = { code: 'AUTH_FAILED' };
        
        this.logger('warn', 'Authentication failed for client', {
          socketId: socket.id,
          token: token ? 'present' : 'missing',
          sessionId: sessionId ? 'present' : 'missing'
        });

        next(error);
      }
    } catch (error) {
      this.logger('error', 'Authentication middleware error', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });

      const authError = new Error('Authentication error') as ExtendedError;
      authError.data = { code: 'AUTH_ERROR' };
      next(authError);
    }
  };

  // Request validation middleware
  public validationMiddleware = (socket: Socket, next: (err?: ExtendedError) => void): void => {
    try {
      // Validate socket handshake data
      const { origin, referer } = socket.handshake.headers;
      const allowedOrigins = this.getAllowedOrigins();

      if (origin && !allowedOrigins.includes(origin)) {
        const error = new Error('Origin not allowed') as ExtendedError;
        error.data = { code: 'INVALID_ORIGIN', origin };
        
        this.logger('warn', 'Invalid origin blocked', {
          socketId: socket.id,
          origin,
          allowedOrigins
        });

        next(error);
        return;
      }

      // Validate user agent (basic bot detection)
      const userAgent = socket.handshake.headers['user-agent'];
      if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
        const error = new Error('Invalid user agent') as ExtendedError;
        error.data = { code: 'INVALID_USER_AGENT', userAgent };
        
        this.logger('warn', 'Suspicious user agent blocked', {
          socketId: socket.id,
          userAgent
        });

        next(error);
        return;
      }

      this.logger('debug', 'Request validation passed', {
        socketId: socket.id,
        origin,
        userAgent: userAgent?.substring(0, 50) + '...'
      });

      next();
    } catch (error) {
      this.logger('error', 'Validation middleware error', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });

      const validationError = new Error('Validation error') as ExtendedError;
      validationError.data = { code: 'VALIDATION_ERROR' };
      next(validationError);
    }
  };

  // Rate limiting middleware
  public rateLimitMiddleware = (socket: Socket, next: (err?: ExtendedError) => void): void => {
    try {
      const clientId = this.getClientIdentifier(socket);
      const now = Date.now();
      
      // Get or create client request data
      let clientData = this.rateLimitMap.get(clientId);
      if (!clientData) {
        clientData = { requests: [], lastRequest: now };
        this.rateLimitMap.set(clientId, clientData);
      }

      // Clean old requests outside the window
      const windowStart = now - this.rateLimitConfig.windowMs;
      clientData.requests = clientData.requests.filter(timestamp => timestamp > windowStart);

      // Check rate limit
      if (clientData.requests.length >= this.rateLimitConfig.maxRequests) {
        const error = new Error(this.rateLimitConfig.message || 'Rate limit exceeded') as ExtendedError;
        error.data = { 
          code: 'RATE_LIMIT_EXCEEDED',
          limit: this.rateLimitConfig.maxRequests,
          windowMs: this.rateLimitConfig.windowMs,
          retryAfter: Math.ceil((clientData.requests[0] + this.rateLimitConfig.windowMs - now) / 1000)
        };

        this.logger('warn', 'Rate limit exceeded', {
          clientId,
          socketId: socket.id,
          requestCount: clientData.requests.length,
          limit: this.rateLimitConfig.maxRequests
        });

        next(error);
        return;
      }

      // Add current request
      clientData.requests.push(now);
      clientData.lastRequest = now;
      this.rateLimitMap.set(clientId, clientData);

      this.logger('debug', 'Rate limit check passed', {
        clientId,
        socketId: socket.id,
        requestCount: clientData.requests.length,
        limit: this.rateLimitConfig.maxRequests
      });

      next();
    } catch (error) {
      this.logger('error', 'Rate limit middleware error', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : String(error)
      });

      const rateLimitError = new Error('Rate limit error') as ExtendedError;
      rateLimitError.data = { code: 'RATE_LIMIT_ERROR' };
      next(rateLimitError);
    }
  };

  // Event-specific middleware factory
  public createEventMiddleware = (eventName: string, validator?: (data: any) => boolean) => {
    return (packet: any[], next: (err?: ExtendedError) => void): void => {
      try {
        const [event, data] = packet;

        // Validate event name matches
        if (event !== eventName) {
          next();
          return;
        }

        // Custom validation if provided
        if (validator && !validator(data)) {
          const error = new Error(`Invalid data for event: ${eventName}`) as ExtendedError;
          error.data = { code: 'INVALID_EVENT_DATA', event: eventName };
          
          this.logger('warn', 'Event validation failed', {
            event: eventName,
            data: typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data
          });

          next(error);
          return;
        }

        // Validate required fields for simulation events
        if (eventName.startsWith('simulation:') && typeof data === 'object') {
          if (!data.simulationId || typeof data.simulationId !== 'number') {
            const error = new Error('simulationId is required for simulation events') as ExtendedError;
            error.data = { code: 'MISSING_SIMULATION_ID', event: eventName };
            next(error);
            return;
          }
        }

        this.logger('debug', 'Event middleware passed', {
          event: eventName,
          dataType: typeof data
        });

        next();
      } catch (error) {
        this.logger('error', 'Event middleware error', {
          event: eventName,
          error: error instanceof Error ? error.message : String(error)
        });

        const eventError = new Error('Event processing error') as ExtendedError;
        eventError.data = { code: 'EVENT_ERROR', event: eventName };
        next(eventError);
      }
    };
  };

  // Authorization middleware for simulation access
  public simulationAuthMiddleware = (socket: Socket, simulationId: number): boolean => {
    try {
      const authData = (socket as any).authData as AuthData;
      
      // For now, allow all authenticated users to access any simulation
      // In production, you'd check permissions based on user roles or simulation ownership
      if (!authData || !authData.userId) {
        this.logger('warn', 'Unauthorized simulation access attempt', {
          socketId: socket.id,
          simulationId,
          reason: 'No authentication data'
        });
        return false;
      }

      // Check if user has permission to access this simulation
      // This is where you'd implement your business logic
      const hasPermission = this.checkSimulationPermission(authData.userId, simulationId);
      
      if (!hasPermission) {
        this.logger('warn', 'Unauthorized simulation access attempt', {
          socketId: socket.id,
          simulationId,
          userId: authData.userId,
          reason: 'Insufficient permissions'
        });
        return false;
      }

      this.logger('debug', 'Simulation access authorized', {
        socketId: socket.id,
        simulationId,
        userId: authData.userId
      });

      return true;
    } catch (error) {
      this.logger('error', 'Simulation auth middleware error', {
        socketId: socket.id,
        simulationId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  };

  // Cleanup expired rate limit data
  public cleanupRateLimitData(): void {
    const now = Date.now();
    const expiredClients: string[] = [];

    this.rateLimitMap.forEach((data, clientId) => {
      // Remove clients that haven't made requests recently
      if (now - data.lastRequest > this.rateLimitConfig.windowMs * 2) {
        expiredClients.push(clientId);
      }
    });

    expiredClients.forEach(clientId => {
      this.rateLimitMap.delete(clientId);
    });

    if (expiredClients.length > 0) {
      this.logger('debug', 'Cleaned up expired rate limit data', {
        expiredClientsCount: expiredClients.length,
        remainingClients: this.rateLimitMap.size
      });
    }
  }

  // Private helper methods
  private isValidSession(token?: string, sessionId?: string): boolean {
    // Basic validation - in production, validate against your auth system
    if (!token && !sessionId) {
      return false; // For development, you might want to return true to allow unauthenticated access
    }

    // For development purposes, accept any non-empty token/session
    // In production, validate JWT tokens or check session store
    if (token === 'development_token' || sessionId) {
      return true;
    }

    // Basic token format validation
    if (token && token.length >= 10) {
      return true;
    }

    return false;
  }

  private extractAuthData(token?: string, sessionId?: string): AuthData {
    // Extract user information from token/session
    // In production, decode JWT or query session store
    
    if (token === 'development_token') {
      return {
        userId: 1, // Default development user
        sessionId: sessionId || 'dev_session',
        permissions: ['read', 'write', 'admin']
      };
    }

    // Basic extraction - in production, properly decode tokens
    return {
      userId: sessionId ? parseInt(sessionId) || 1 : 1,
      sessionId: sessionId || 'anonymous',
      permissions: ['read', 'write']
    };
  }

  private getAllowedOrigins(): string[] {
    // Get allowed origins from environment or config
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000'
    ];

    // Add development origins
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3001'
      );
    }

    return allowedOrigins;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    // Basic bot detection
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private getClientIdentifier(socket: Socket): string {
    // Use IP address + user agent for client identification
    const ip = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    
    // In production, you might want to use a hash for privacy
    return `${ip}-${userAgent}`.substring(0, 100);
  }

  private checkSimulationPermission(userId: number, simulationId: number): boolean {
    // Basic permission check - in production, query your database
    // For now, allow all authenticated users to access any simulation
    
    // You could implement:
    // - Check if user owns the simulation
    // - Check if user is a collaborator
    // - Check user role/permissions
    // - Check simulation visibility settings
    
    return userId > 0; // Basic check - user must be authenticated
  }

  // Public utility methods
  public getRateLimitStats(): { totalClients: number; averageRequests: number } {
    const totalClients = this.rateLimitMap.size;
    let totalRequests = 0;

    this.rateLimitMap.forEach(data => {
      totalRequests += data.requests.length;
    });

    return {
      totalClients,
      averageRequests: totalClients > 0 ? Math.round(totalRequests / totalClients) : 0
    };
  }

  public isRateLimited(socketId: string): boolean {
    const socket = { handshake: { address: socketId } } as any;
    const clientId = this.getClientIdentifier(socket);
    const clientData = this.rateLimitMap.get(clientId);
    
    if (!clientData) return false;

    const now = Date.now();
    const windowStart = now - this.rateLimitConfig.windowMs;
    const recentRequests = clientData.requests.filter(timestamp => timestamp > windowStart);
    
    return recentRequests.length >= this.rateLimitConfig.maxRequests;
  }

  public updateRateLimitConfig(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
    this.logger('info', 'Rate limit configuration updated', {
      newConfig: this.rateLimitConfig
    });
  }
}

// Event validation helpers
export const eventValidators = {
  simulationJoin: (data: any): boolean => {
    return data && 
           typeof data.simulationId === 'number' && 
           data.simulationId > 0;
  },

  simulationControl: (data: any): boolean => {
    return data && 
           typeof data.simulationId === 'number' && 
           data.simulationId > 0;
  },

  robotUpdate: (data: any): boolean => {
    return data &&
           typeof data.robotId === 'number' &&
           typeof data.simulationId === 'number' &&
           typeof data.x_position === 'number' &&
           typeof data.y_position === 'number' &&
           typeof data.battery_level === 'number' &&
           typeof data.status === 'string' &&
           data.robotId > 0 &&
           data.simulationId > 0 &&
           data.x_position >= 0 &&
           data.y_position >= 0 &&
           data.battery_level >= 0 &&
           data.battery_level <= 200;
  },

  taskUpdate: (data: any): boolean => {
    return data &&
           typeof data.taskId === 'number' &&
           typeof data.simulationId === 'number' &&
           typeof data.status === 'string' &&
           data.taskId > 0 &&
           data.simulationId > 0 &&
           ['pending', 'assigned', 'in_progress', 'completed', 'failed'].includes(data.status);
  }
};

// Middleware factory for easy setup
export const createSocketMiddleware = (
  rateLimitConfig?: RateLimitConfig,
  logger?: (level: string, message: string, meta?: any) => void
) => {
  return new SocketMiddleware(rateLimitConfig, logger);
};