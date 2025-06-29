// backend/src/models/SimulationSharing.ts
import { Pool, QueryResult } from 'pg';

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

export interface SimulationShare {
  id?: number;
  simulation_id: number;
  user_id: number;
  permission_level: PermissionLevel;
  shared_by: number;
  shared_at?: Date;
  message?: string;
}

export interface UserSimulationStats {
  total_simulations: number;
  running_simulations: number;
  completed_simulations: number;
  paused_simulations: number;
  failed_simulations: number;
  shared_simulations: number;
  public_simulations: number;
  total_robots: number;
  total_tasks: number;
  total_walls: number;
}

export interface UserPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_execute: boolean;
  permission_level: PermissionLevel | null;
  is_owner: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class SimulationSharing {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Share simulation with user
  async shareWithUser(shareData: Omit<SimulationShare, 'id' | 'shared_at'>): Promise<SimulationShare> {
    const query = `
      INSERT INTO simulation_shares (simulation_id, user_id, permission_level, shared_by, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      shareData.simulation_id,
      shareData.user_id,
      shareData.permission_level,
      shareData.shared_by,
      shareData.message
    ];

    const result: QueryResult<SimulationShare> = await this.pool.query(query, values);
    return result.rows[0];
  }

  // Find share by simulation and user
  async findBySimulationAndUser(simulationId: number, userId: number): Promise<SimulationShare | null> {
    const query = `
      SELECT * FROM simulation_shares 
      WHERE simulation_id = $1 AND user_id = $2
    `;
    
    const result: QueryResult<SimulationShare> = await this.pool.query(query, [simulationId, userId]);
    return result.rows[0] || null;
  }

  // Update user permission
  async updateUserPermission(simulationId: number, userId: number, permissionLevel: PermissionLevel): Promise<void> {
    const query = `
      UPDATE simulation_shares 
      SET permission_level = $1, updated_at = CURRENT_TIMESTAMP
      WHERE simulation_id = $2 AND user_id = $3
    `;

    await this.pool.query(query, [permissionLevel, simulationId, userId]);
  }

  // Remove user access
  async removeUserAccess(simulationId: number, userId: number): Promise<void> {
    const query = `
      DELETE FROM simulation_shares 
      WHERE simulation_id = $1 AND user_id = $2
    `;

    await this.pool.query(query, [simulationId, userId]);
  }

  // Get simulation with sharing information
  async getSimulationWithSharing(simulationId: number): Promise<any> {
    const query = `
      SELECT 
        s.*,
        owner.id as owner_id,
        owner.email as owner_email,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', shared_user.id,
              'email', shared_user.email,
              'first_name', shared_user.first_name,
              'last_name', shared_user.last_name,
              'permission_level', ss.permission_level,
              'shared_at', ss.shared_at,
              'shared_by', ss.shared_by
            )
          ) FILTER (WHERE ss.user_id IS NOT NULL),
          '[]'
        ) as shared_with,
        (SELECT COUNT(*) FROM robots WHERE simulation_id = s.id) as robot_count,
        (SELECT COUNT(*) FROM tasks WHERE simulation_id = s.id) as task_count,
        (SELECT COUNT(*) FROM walls WHERE simulation_id = s.id) as wall_count
      FROM simulations s
      JOIN users owner ON s.user_id = owner.id
      LEFT JOIN simulation_shares ss ON s.id = ss.simulation_id
      LEFT JOIN users shared_user ON ss.user_id = shared_user.id
      WHERE s.id = $1
      GROUP BY s.id, owner.id, owner.email, owner.first_name, owner.last_name
    `;

    const result = await this.pool.query(query, [userId, limit]);
    
    return result.rows.map(row => ({
      ...row,
      owner: {
        id: row.user_id,
        first_name: row.owner_first_name,
        last_name: row.owner_last_name
      }
    }));
  }

  // Get simulations shared with user (paginated)
  async getSharedSimulations(userId: number, options: PaginationOptions): Promise<PaginatedResult<any>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT s.id) as count
      FROM simulations s
      JOIN simulation_shares ss ON s.id = ss.simulation_id
      WHERE ss.user_id = $1
    `;
    const countResult = await this.pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT DISTINCT s.*, 
        owner.id as owner_id,
        owner.email as owner_email,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        ss.permission_level,
        ss.shared_at,
        (SELECT COUNT(*) FROM robots WHERE simulation_id = s.id) as robot_count,
        (SELECT COUNT(*) FROM tasks WHERE simulation_id = s.id) as task_count,
        (SELECT COUNT(*) FROM walls WHERE simulation_id = s.id) as wall_count
      FROM simulations s
      JOIN users owner ON s.user_id = owner.id
      JOIN simulation_shares ss ON s.id = ss.simulation_id
      WHERE ss.user_id = $1
      ORDER BY s.updated_at DESC
      LIMIT $2 OFFSET $3
    `;

    const dataResult = await this.pool.query(dataQuery, [userId, limit, offset]);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows.map(row => ({
        ...row,
        owner: {
          id: row.owner_id,
          email: row.owner_email,
          first_name: row.owner_first_name,
          last_name: row.owner_last_name
        },
        shared_with: [], // Will be populated separately if needed
        permissions: {
          can_read: true,
          can_write: ['write', 'admin'].includes(row.permission_level),
          can_delete: row.permission_level === 'admin',
          can_share: row.permission_level === 'admin',
          can_execute: ['write', 'admin'].includes(row.permission_level),
          permission_level: row.permission_level,
          is_owner: false
        }
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Get simulations owned by user (paginated)
  async getOwnedSimulations(userId: number, options: PaginationOptions, filters: any = {}): Promise<PaginatedResult<any>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Build WHERE clause based on filters
    let whereConditions = ['s.user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (filters.status) {
      whereConditions.push(`s.status = ${paramIndex}`);
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters.search) {
      whereConditions.push(`(s.name ILIKE ${paramIndex} OR s.description ILIKE ${paramIndex})`);
      queryParams.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.is_public !== undefined) {
      whereConditions.push(`s.is_public = ${paramIndex}`);
      queryParams.push(filters.is_public);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM simulations s
      WHERE ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT s.*, 
        owner.id as owner_id,
        owner.email as owner_email,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        (SELECT COUNT(*) FROM robots WHERE simulation_id = s.id) as robot_count,
        (SELECT COUNT(*) FROM tasks WHERE simulation_id = s.id) as task_count,
        (SELECT COUNT(*) FROM walls WHERE simulation_id = s.id) as wall_count,
        (SELECT COUNT(*) FROM simulation_shares WHERE simulation_id = s.id) as shared_count
      FROM simulations s
      JOIN users owner ON s.user_id = owner.id
      WHERE ${whereClause}
      ORDER BY s.updated_at DESC
      LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await this.pool.query(dataQuery, queryParams);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows.map(row => ({
        ...row,
        owner: {
          id: row.owner_id,
          email: row.owner_email,
          first_name: row.owner_first_name,
          last_name: row.owner_last_name
        },
        shared_with: [], // Will be populated separately if needed
        permissions: {
          can_read: true,
          can_write: true,
          can_delete: true,
          can_share: true,
          can_execute: true,
          permission_level: null,
          is_owner: true
        }
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Get public simulations (paginated)
  async getPublicSimulations(options: PaginationOptions, search?: string): Promise<PaginatedResult<any>> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    let whereClause = 's.is_public = true';
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (s.name ILIKE ${paramIndex} OR s.description ILIKE ${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM simulations s
      WHERE ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT s.*, 
        owner.id as owner_id,
        owner.email as owner_email,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        (SELECT COUNT(*) FROM robots WHERE simulation_id = s.id) as robot_count,
        (SELECT COUNT(*) FROM tasks WHERE simulation_id = s.id) as task_count,
        (SELECT COUNT(*) FROM walls WHERE simulation_id = s.id) as wall_count,
        (SELECT COUNT(*) FROM simulation_shares WHERE simulation_id = s.id) as shared_count
      FROM simulations s
      JOIN users owner ON s.user_id = owner.id
      WHERE ${whereClause}
      ORDER BY s.updated_at DESC
      LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const dataResult = await this.pool.query(dataQuery, queryParams);
    const totalPages = Math.ceil(total / limit);

    return {
      data: dataResult.rows.map(row => ({
        ...row,
        owner: {
          id: row.owner_id,
          email: row.owner_email,
          first_name: row.owner_first_name,
          last_name: row.owner_last_name
        },
        shared_with: [], // Will be populated separately if needed
        permissions: {
          can_read: true,
          can_write: false,
          can_delete: false,
          can_share: false,
          can_execute: false,
          permission_level: null,
          is_owner: false
        }
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Get all shares for a simulation
  async getSimulationShares(simulationId: number): Promise<SimulationShare[]> {
    const query = `
      SELECT ss.*, 
        u.email, u.first_name, u.last_name,
        shared_by_user.first_name as shared_by_first_name,
        shared_by_user.last_name as shared_by_last_name
      FROM simulation_shares ss
      JOIN users u ON ss.user_id = u.id
      JOIN users shared_by_user ON ss.shared_by = shared_by_user.id
      WHERE ss.simulation_id = $1
      ORDER BY ss.shared_at DESC
    `;

    const result = await this.pool.query(query, [simulationId]);
    return result.rows;
  }

  // Clean up expired shares (if you implement expiration)
  async cleanupExpiredShares(): Promise<number> {
    const query = `
      DELETE FROM simulation_shares 
      WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
    `;

    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }

  // Bulk share with multiple users
  async bulkShareWithUsers(
    simulationId: number, 
    userEmails: string[], 
    permissionLevel: PermissionLevel, 
    sharedBy: number,
    message?: string
  ): Promise<{ successful: number; failed: { email: string; reason: string }[] }> {
    const client = await this.pool.connect();
    let successful = 0;
    const failed: { email: string; reason: string }[] = [];

    try {
      await client.query('BEGIN');

      for (const email of userEmails) {
        try {
          // Find user by email
          const userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
          
          if (userResult.rows.length === 0) {
            failed.push({ email, reason: 'User not found' });
            continue;
          }

          const userId = userResult.rows[0].id;

          // Check if already shared
          const existingShare = await client.query(
            'SELECT 1 FROM simulation_shares WHERE simulation_id = $1 AND user_id = $2',
            [simulationId, userId]
          );

          if (existingShare.rows.length > 0) {
            failed.push({ email, reason: 'Already shared with this user' });
            continue;
          }

          // Create share
          await client.query(
            'INSERT INTO simulation_shares (simulation_id, user_id, permission_level, shared_by, message) VALUES ($1, $2, $3, $4, $5)',
            [simulationId, userId, permissionLevel, sharedBy, message]
          );

          successful++;
        } catch (error) {
          failed.push({ email, reason: 'Database error' });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { successful, failed };
  }
}