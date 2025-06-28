// backend/src/utils/password.ts
import bcrypt from 'bcrypt';
import { authConfig } from '../config/auth';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, authConfig.password.saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < authConfig.password.minLength) {
    errors.push(`Password must be at least ${authConfig.password.minLength} characters`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character');
  }
  
  return { isValid: errors.length === 0, errors };
};