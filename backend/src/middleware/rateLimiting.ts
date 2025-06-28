// backend/src/middleware/rateLimiting.ts
import rateLimit from 'express-rate-limit';
import { authConfig } from '../config/auth';

export const loginRateLimit = rateLimit({
  windowMs: authConfig.rateLimiting.loginAttempts.windowMs,
  max: authConfig.rateLimiting.loginAttempts.maxAttempts,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const registerRateLimit = rateLimit({
  windowMs: authConfig.rateLimiting.registration.windowMs,
  max: authConfig.rateLimiting.registration.maxAttempts,
  message: {
    success: false,
    message: 'Too many registration attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});