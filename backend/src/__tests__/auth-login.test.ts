// backend/src/__tests__/auth-login.test.ts

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from '../db/test-setup';
import { createUniqueUser, getLoginData } from './helpers/authTestData';

describe('Auth - Login', () => {
  let testUser: any;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Create a fresh user for each test
    testUser = createUniqueUser();
    await request(app)
      .post('/api/auth/register')
      .send(testUser);
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('POST /api/auth/login - Success', () => {
    it('should login with valid credentials', async () => {
      const loginData = getLoginData(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.message).toBe('Login successful');
      
      // Should not return password
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should handle case insensitive email', async () => {
      const loginData = {
        email: testUser.email.toUpperCase(),
        password: testUser.password
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update last_login timestamp', async () => {
      const loginData = getLoginData(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(res.status).toBe(200);
      expect(res.body.data.user.last_login).toBeDefined();
    });
  });

  describe('POST /api/auth/login - Failures', () => {
    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing credentials', async () => {
      const noEmail = await request(app)
        .post('/api/auth/login')
        .send({ password: testUser.password });

      const noPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });

      expect(noEmail.status).toBe(400);
      expect(noPassword.status).toBe(400);
    });
  });
});