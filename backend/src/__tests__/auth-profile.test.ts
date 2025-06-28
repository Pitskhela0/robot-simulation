// backend/src/__tests__/auth-profile.test.ts

import request from 'supertest';
import app from '../index';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase } from '../db/test-setup';
import { createUniqueUser, getLoginData } from './helpers/authTestData';

describe('Auth - Profile', () => {
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    // Create user and get access token
    testUser = createUniqueUser();
    
    await request(app)
      .post('/api/auth/register')
      .send(testUser);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send(getLoginData(testUser));

    accessToken = loginRes.body.data.accessToken;
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.first_name).toBe(testUser.first_name);
      expect(res.body.data.user.last_name).toBe(testUser.last_name);
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.created_at).toBeDefined();
      
      // Should not return sensitive data
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authorization token required');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid token');
    });

    it('should reject malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authorization token required');
    });

    it('should reject missing Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authorization token required');
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update full profile', async () => {
      const updates = {
        first_name: 'Updated',
        last_name: 'Name'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.first_name).toBe(updates.first_name);
      expect(res.body.data.user.last_name).toBe(updates.last_name);
      expect(res.body.message).toBe('Profile updated');
    });

    it('should update partial profile (first name only)', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ first_name: 'OnlyFirst' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.first_name).toBe('OnlyFirst');
      expect(res.body.data.user.last_name).toBe(testUser.last_name);
    });

    it('should update partial profile (last name only)', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ last_name: 'OnlyLast' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.last_name).toBe('OnlyLast');
      expect(res.body.data.user.first_name).toBe(testUser.first_name);
    });

    it('should handle empty update gracefully', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should trim whitespace from names', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          first_name: '  Trimmed  ',
          last_name: '  Name  '
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.first_name).toBe('Trimmed');
      expect(res.body.data.user.last_name).toBe('Name');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ first_name: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer invalid.token')
        .send({ first_name: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid token');
    });
  });
});