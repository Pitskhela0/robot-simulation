// backend/src/models/User.ts
import { Pool, QueryResult } from 'pg';
import { hashPassword, comparePassword } from '../utils/password';
import { UserRole, userRoles } from '../config/auth';

export interface UserData {
  id?: number;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  created_at?: Date;
  updated_at?: Date;
  last_login?: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

export class User {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async create(userData: CreateUserData): Promise<UserData> {
    const {
      email,
      password,
      first_name,
      last_name,
      role = userRoles.USER
    } = userData;

    const password_hash = await hashPassword(password);

    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, created_at
    `;

    const result: QueryResult<UserData> = await this.pool.query(query, [
      email, password_hash, first_name, last_name, role
    ]);
    
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<UserData | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result: QueryResult<UserData> = await this.pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async findById(id: number): Promise<UserData | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result: QueryResult<UserData> = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async verifyPassword(email: string, password: string): Promise<UserData | null> {
    const user = await this.findByEmail(email);
    
    if (!user || !user.password_hash) {
      return null;
    }

    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  }
}