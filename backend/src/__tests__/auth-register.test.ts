// backend/src/__tests__/auth-register.test.ts

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from '../db/test-setup';
import { 
  validUser, 
  invalidEmails, 
  weakPasswords, 
  createUniqueUser,
  testScenarios 
} from './helpers/authTestData';

describe('Auth - Registration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('POST /api/auth/register - Success', () => {
    it('should register new user with full data', async () => {
      const userData = createUniqueUser();
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.user.first_name).toBe(userData.first_name);
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.message).toBe('User registered successfully');
    });

    it('should register with minimal data', async () => {
      const userData = {
        email: `minimal${Date.now()}@test.com`,
        password: 'MinimalPass123!'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.user.first_name).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      const userData = createUniqueUser();
      userData.email = userData.email.toUpperCase();

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe(userData.email.toLowerCase());
    });
  });

  describe('POST /api/auth/register - Validation Errors', () => {
    it('should reject invalid emails', async () => {
      for (const email of invalidEmails) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ ...createUniqueUser(), email });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('should reject weak passwords', async () => {
      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({ 
            ...createUniqueUser(), 
            password
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Password requirements not met');
      }
    });

    it('should reject missing email', async () => {
      const { email, ...userData } = createUniqueUser();
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const { password, ...userData } = createUniqueUser();
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register - Business Logic', () => {
    it('should reject duplicate email', async () => {
      const userData = createUniqueUser();

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered');
    });

    it('should reject case-insensitive duplicate email', async () => {
      const userData = createUniqueUser();

      // First registration with lowercase
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try with uppercase
      const duplicateData = { ...userData, email: userData.email.toUpperCase() };
      const res = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered');
    });
  });
});