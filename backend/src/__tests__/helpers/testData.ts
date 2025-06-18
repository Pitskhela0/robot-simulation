// backend/src/__tests__/helpers/testData.ts

import { Pool } from 'pg';
import { SimulationData } from '../../models/Simulation';

export class TestDataHelper {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Create a test user
  async createTestUser(userData: {
    username?: string;
    email?: string;
    password_hash?: string;
  } = {}): Promise<{ id: number; username: string; email: string }> {
    const {
      username = 'testuser',
      email = 'test@example.com',
      password_hash = 'hashedpassword'
    } = userData;

    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email
    `;

    const result = await this.pool.query(query, [username, email, password_hash]);
    return result.rows[0];
  }

  // Create a test simulation
  async createTestSimulation(user_id: number, simulationData: Partial<SimulationData> = {}): Promise<SimulationData> {
    const {
      name = 'Test Simulation',
      description = 'A test simulation',
      grid_width = 10,
      grid_height = 10,
      status = 'created'
    } = simulationData;

    const query = `
      INSERT INTO simulations (user_id, name, description, grid_width, grid_height, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(query, [user_id, name, description, grid_width, grid_height, status]);
    return result.rows[0];
  }

  // Create multiple test simulations
  async createMultipleSimulations(user_id: number, count: number): Promise<SimulationData[]> {
    const simulations = [];
    
    for (let i = 1; i <= count; i++) {
      const simulation = await this.createTestSimulation(user_id, {
        name: `Test Simulation ${i}`,
        description: `Test simulation number ${i}`,
        grid_width: 10 + i,
        grid_height: 10 + i,
        status: i % 2 === 0 ? 'completed' : 'created'
      });
      simulations.push(simulation);
    }

    return simulations;
  }

  // Clean up test data
  async cleanupTestData(): Promise<void> {
    // Clean in reverse order due to foreign key constraints
    await this.pool.query('DELETE FROM simulations');
    await this.pool.query('DELETE FROM users');
  }

  // Get simulation count
  async getSimulationCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM simulations');
    return parseInt(result.rows[0].count);
  }

  // Get user count
  async getUserCount(): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }
}