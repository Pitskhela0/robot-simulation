// backend/src/__tests__/helpers/authTestData.ts

export const validUser = {
  email: 'test@example.com',
  password: 'TestPass123!',
  first_name: 'Test',
  last_name: 'User'
};

export const adminUser = {
  email: 'admin@example.com',
  password: 'AdminPass123!',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin'
};

export const invalidEmails = [
  'invalid-email',
  '@example.com',
  'test@',
  'test',
  ''
];

export const weakPasswords = [
  '123',                    // too short
  'nospecial123',          // no special char
  'NOLOWERCASE123!',       // no lowercase
  'nouppercase123!',       // no uppercase
  'NoNumbers!',            // no numbers
  'short!'                 // too short
];

export const validPasswords = [
  'TestPass123!',
  'SecurePassword1@',
  'MyPass2024#',
  'StrongAuth99$'
];

// Helper function to create unique test user data
export const createUniqueUser = (suffix?: string) => ({
  email: `test${suffix || Date.now()}@example.com`,
  password: 'TestPass123!',
  first_name: 'Test',
  last_name: 'User'
});

// Helper function to get login credentials from user data
export const getLoginData = (user: typeof validUser) => ({
  email: user.email,
  password: user.password
});

// Common test scenarios
export const testScenarios = {
  validRegistration: validUser,
  validLogin: getLoginData(validUser),
  duplicateEmail: validUser,
  weakPassword: { ...validUser, password: 'weak' },
  invalidEmail: { ...validUser, email: 'invalid-email' },
  missingPassword: { email: validUser.email },
  missingEmail: { password: validUser.password }
};