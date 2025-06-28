// backend/src/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import { authConfig } from '../config/auth';

export const loginRateLimit = rateLimit({
  windowMs: authConfig.rateLimiting.windowMs,
  max: authConfig.rateLimiting.maxAttempts,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later'
  }
});