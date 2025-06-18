// backend/jest.config.js
module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "setupFilesAfterEnv": ["<rootDir>/src/__tests__/setup.ts"],
  "testMatch": ["**/__tests__/**/*.test.ts"],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/__tests__/**/*"
  ],
  "testTimeout": 30000,
  "maxWorkers": 1,
  "forceExit": true,
  "detectOpenHandles": true,
  "globalTeardown": "<rootDir>/src/__tests__/teardown.ts"
}
