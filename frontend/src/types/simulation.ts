// src/types/simulation.ts
export interface Simulation {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  grid_width: number;
  grid_height: number;
  base_station_x?: number | null;
  base_station_y?: number | null;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  
  // Ownership and sharing
  owner: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  is_public: boolean;
  shared_with: SharedUser[];
  permissions: UserPermissions;
  
  // Statistics
  robot_count?: number;
  task_count?: number;
  wall_count?: number;
}

export interface SharedUser {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  permission_level: PermissionLevel;
  shared_at: string;
  shared_by: number;
}

export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

export interface UserPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_share: boolean;
  can_execute: boolean;
  permission_level: PermissionLevel;
  is_owner: boolean;
}

export interface ShareSimulationPayload {
  user_email: string;
  permission_level: PermissionLevel;
  message?: string;
}

export interface UpdatePermissionPayload {
  user_id: number;
  permission_level: PermissionLevel;
}

// Simulation filter and sort options
export interface SimulationFilters {
  user_id?: number;
  status?: string;
  is_public?: boolean;
  shared_with_me?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface SimulationSortOptions {
  sort_by: 'created_at' | 'updated_at' | 'name' | 'status';
  sort_order: 'asc' | 'desc';
}

export interface PaginatedSimulations {
  data: Simulation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters_applied: SimulationFilters;
}

// Simulation access levels for UI
export enum SimulationAccessLevel {
  OWNER = 'owner',
  SHARED_ADMIN = 'shared_admin',
  SHARED_WRITE = 'shared_write',
  SHARED_READ = 'shared_read',
  PUBLIC_READ = 'public_read',
  NO_ACCESS = 'no_access'
}

// Permission check utilities
export class SimulationPermissions {
  static canRead(simulation: Simulation, userId?: number): boolean {
    if (simulation.is_public) return true;
    if (!userId) return false;
    if (simulation.user_id === userId) return true;
    return simulation.shared_with.some(user => user.id === userId);
  }

  static canWrite(simulation: Simulation, userId?: number): boolean {
    if (!userId) return false;
    if (simulation.user_id === userId) return true;
    return simulation.shared_with.some(
      user => user.id === userId && 
      [PermissionLevel.WRITE, PermissionLevel.ADMIN].includes(user.permission_level)
    );
  }

  static canDelete(simulation: Simulation, userId?: number): boolean {
    if (!userId) return false;
    if (simulation.user_id === userId) return true;
    return simulation.shared_with.some(
      user => user.id === userId && user.permission_level === PermissionLevel.ADMIN
    );
  }

  static canShare(simulation: Simulation, userId?: number): boolean {
    if (!userId) return false;
    if (simulation.user_id === userId) return true;
    return simulation.shared_with.some(
      user => user.id === userId && user.permission_level === PermissionLevel.ADMIN
    );
  }

  static canExecute(simulation: Simulation, userId?: number): boolean {
    if (!userId) return false;
    if (simulation.user_id === userId) return true;
    return simulation.shared_with.some(
      user => user.id === userId && 
      [PermissionLevel.WRITE, PermissionLevel.ADMIN].includes(user.permission_level)
    );
  }

  static getAccessLevel(simulation: Simulation, userId?: number): SimulationAccessLevel {
    if (!userId) {
      return simulation.is_public ? SimulationAccessLevel.PUBLIC_READ : SimulationAccessLevel.NO_ACCESS;
    }

    if (simulation.user_id === userId) {
      return SimulationAccessLevel.OWNER;
    }

    const sharedUser = simulation.shared_with.find(user => user.id === userId);
    if (sharedUser) {
      switch (sharedUser.permission_level) {
        case PermissionLevel.ADMIN:
          return SimulationAccessLevel.SHARED_ADMIN;
        case PermissionLevel.WRITE:
          return SimulationAccessLevel.SHARED_WRITE;
        case PermissionLevel.READ:
          return SimulationAccessLevel.SHARED_READ;
      }
    }

    return simulation.is_public ? SimulationAccessLevel.PUBLIC_READ : SimulationAccessLevel.NO_ACCESS;
  }

  static getPermissionDisplayName(level: PermissionLevel): string {
    switch (level) {
      case PermissionLevel.READ:
        return 'View Only';
      case PermissionLevel.WRITE:
        return 'Edit';
      case PermissionLevel.ADMIN:
        return 'Full Access';
      default:
        return 'Unknown';
    }
  }

  static getAccessLevelDisplayName(level: SimulationAccessLevel): string {
    switch (level) {
      case SimulationAccessLevel.OWNER:
        return 'Owner';
      case SimulationAccessLevel.SHARED_ADMIN:
        return 'Shared (Full Access)';
      case SimulationAccessLevel.SHARED_WRITE:
        return 'Shared (Edit)';
      case SimulationAccessLevel.SHARED_READ:
        return 'Shared (View Only)';
      case SimulationAccessLevel.PUBLIC_READ:
        return 'Public (View Only)';
      case SimulationAccessLevel.NO_ACCESS:
        return 'No Access';
      default:
        return 'Unknown';
    }
  }
}