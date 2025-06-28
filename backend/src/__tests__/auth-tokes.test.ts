// backend/src/__tests__/auth-tokens.test.ts

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from '../db/test-setup';
import { createUniqueUser, getLoginData } from './helpers/authTestData';

describe('Auth - Tokens', () => {
  let testUser: any;
  let tokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Create user and get tokens
    testUser = createUniqueUser();
    
    await request(app)
      .post('/api/auth/register')
      .send(testUser);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(getLoginData(testUser));

    tokens = loginRes.body.data;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.accessToken).not.toBe(tokens.accessToken);
      expect(res.body.message).toBe('Token refreshed');
    });

    it('should reject invalid refresh token format', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.format' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid refresh token');
    });

    it('should reject completely invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'completely-invalid' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid refresh token');
    });

    it('should reject missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Refresh token required');
    });

    it('should reject empty refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should logout successfully without refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should invalidate refresh token after logout', async () => {
      // Logout first
      await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: tokens.refreshToken });

      // Try to use the same refresh token
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid refresh token');
    });

    it('should handle invalid refresh token gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Token Security', () => {
    it('should generate different tokens on each login', async () => {
      // Login again with same user
      const secondLogin = await request(app)
        .post('/api/auth/login')
        .send(getLoginData(testUser));

      const newTokens = secondLogin.body.data;

      expect(newTokens.accessToken).not.toBe(tokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('should store refresh token in database', async () => {
      // This is tested implicitly by the refresh working
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
    });
  });
});