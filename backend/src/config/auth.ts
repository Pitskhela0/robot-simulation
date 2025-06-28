// backend/src/config/auth.ts
export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d'
  },
  password: {
    saltRounds: 12,
    minLength: 8
  },
  rateLimiting: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }
};

export const userRoles = {
  ADMIN: 'admin',
  USER: 'user'
} as const;

export type UserRole = typeof userRoles[keyof typeof userRoles];