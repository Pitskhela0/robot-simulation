// backend/src/websocket/config.ts

export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  transports: string[];
  allowEIO3: boolean;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    message: string;
  };
  auth: {
    enabled: boolean;
    required: boolean;
    timeout: number;
  };
}

export const getWebSocketConfig = (): WebSocketConfig => {
  return {
    cors: {
      origin: process.env.WEBSOCKET_CORS_ORIGIN?.split(',') || [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT || '60000'),
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '25000'),
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    rateLimit: {
      windowMs: parseInt(process.env.WEBSOCKET_RATE_LIMIT_WINDOW || '60000'),
      maxRequests: parseInt(process.env.WEBSOCKET_RATE_LIMIT_MAX || '100'),
      message: 'Too many requests from this client'
    },
    auth: {
      enabled: process.env.WEBSOCKET_AUTH_ENABLED === 'true',
      required: process.env.WEBSOCKET_AUTH_REQUIRED === 'true',
      timeout: parseInt(process.env.WEBSOCKET_AUTH_TIMEOUT || '5000')
    }
  };
};