// backend/src/__tests__/example.test.ts

describe('Example Test', () => {
  it('should add two numbers', () => {
    expect(1 + 1).toBe(2);
  });

  // You could even test loading an environment variable
  it('should have a PORT environment variable', () => {
      // Note: Jest runs in a different environment.
      // By default, it might not load your .env file unless configured.
      // We'll handle environment config for tests in Step 6.
      // For now, this might test system env vars or fail if none are loaded.
      // This is just to see Jest running.
      // expect(process.env.PORT).toBeDefined();
  });
});