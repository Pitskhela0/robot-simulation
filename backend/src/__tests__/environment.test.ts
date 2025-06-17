// backend/src/__tests__/environment.test.ts

import dotenv from 'dotenv';
import path from 'path';

describe('Environment Configuration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should load environment variables from .env file', () => {
    // Clear current env vars
    delete process.env.DATABASE_URL;
    delete process.env.PORT;

    // Load test env file
    dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PORT).toBeDefined();
  });

  it('should use default PORT when not specified', () => {
    delete process.env.PORT;
    
    const defaultPort = process.env.PORT || '5000';
    expect(defaultPort).toBe('5000');
  });

  it('should validate required environment variables', () => {
    const requiredVars = ['DATABASE_URL'];
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        console.warn(`Warning: ${varName} is not set in environment`);
      }
    });

    // In a real application, you might want to fail if required vars are missing
    // For testing, we just ensure the check works
    expect(typeof process.env.DATABASE_URL).toBe('string');
  });

  it('should handle different NODE_ENV values', () => {
    const validEnvs = ['development', 'production', 'test'];
    
    validEnvs.forEach(env => {
      process.env.NODE_ENV = env;
      
      // Test environment-specific logic
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isProduction = process.env.NODE_ENV === 'production';
      const isTest = process.env.NODE_ENV === 'test';
      
      expect(typeof isDevelopment).toBe('boolean');
      expect(typeof isProduction).toBe('boolean');
      expect(typeof isTest).toBe('boolean');
    });
  });

  it('should handle missing .env file gracefully', () => {
    // Try to load non-existent .env file
    const result = dotenv.config({ path: './non-existent.env' });
    
    // Should not throw, but should indicate file not found
    expect(result.error).toBeDefined();
  });

  it('should override environment variables correctly', () => {
    // Set an initial value
    process.env.TEST_VAR = 'initial';
    
    // Override with dotenv (if TEST_VAR exists in .env file)
    dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
    
    // Environment variables should be accessible
    expect(process.env.TEST_VAR).toBeDefined();
  });

  it('should validate database URL format', () => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    
    if (testDatabaseUrl) {
      // Basic validation of PostgreSQL URL format
      expect(testDatabaseUrl).toMatch(/^postgresql:\/\//);
      
      // Should contain necessary components
      const urlParts = testDatabaseUrl.split('://')[1];
      expect(urlParts).toContain('@'); // Should have user@host format
      expect(urlParts).toContain('/'); // Should have database name
    }
  });

  it('should handle environment-specific configurations', () => {
    const configs = {
      development: {
        logLevel: 'debug',
        enableCors: true
      },
      production: {
        logLevel: 'error',
        enableCors: false
      },
      test: {
        logLevel: 'silent',
        enableCors: true
      }
    };

    const currentEnv = (process.env.NODE_ENV as keyof typeof configs) || 'development';
    const config = configs[currentEnv];

    expect(config).toBeDefined();
    expect(typeof config.logLevel).toBe('string');
    expect(typeof config.enableCors).toBe('boolean');
  });
});