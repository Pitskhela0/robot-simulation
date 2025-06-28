// backend/src/utils/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';
import { authConfig } from '../config/auth';
import { Pool } from 'pg';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export class JWTManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  generateAccessToken(payload: JWTPayload): string {
    const signOptions: SignOptions = {
  expiresIn: authConfig.jwt.accessTokenExpiry as jwt.SignOptions['expiresIn']
};

    return jwt.sign(
      payload, 
      authConfig.jwt.secret, 
      signOptions
    );
  }

  generateRefreshToken(userId: number): string {
    const payload = { userId };
    const signOptions: SignOptions = {
  expiresIn: authConfig.jwt.refreshTokenExpiry as jwt.SignOptions['expiresIn']
};


    return jwt.sign(
      payload, 
      authConfig.jwt.secret, 
      signOptions
    );
  }

  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, authConfig.jwt.secret) as JWTPayload;
  }

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.pool.query(
      'INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)',
      [userId, refreshToken, expiresAt]
    );
  }

  async validateRefreshToken(refreshToken: string): Promise<number | null> {
    try {
      // First verify the JWT token itself
      const decoded = jwt.verify(refreshToken, authConfig.jwt.secret) as any;
      
      // Check if it exists in database and hasn't expired
      const result = await this.pool.query(
        'SELECT user_id FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW()',
        [refreshToken]
      );
      
      return result.rows[0]?.user_id || null;
    } catch (error) {
      return null;
    }
  }

  async removeRefreshToken(refreshToken: string): Promise<void> {
    await this.pool.query('DELETE FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
  }
}