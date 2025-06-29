// src/services/simulationService.ts
import apiClient from './apiClient';
import { 
  Simulation, 
  SimulationFilters, 
  SimulationSortOptions, 
  PaginatedSimulations,
  ShareSimulationPayload,
  UpdatePermissionPayload,
  PermissionLevel 
} from '../types/simulation';

interface CreateSimulationPayload {
  name: string;
  grid_width: number;
  grid_height: number;
  description?: string;
  is_public?: boolean;
}

export interface UpdateSimulationPayload {
  name?: string;
  grid_width?: number;
  grid_height?: number;
  description?: string;
  base_station_x?: number | null;
  base_station_y?: number | null;
  is_public?: boolean;
}

// Core simulation operations
export const createSimulation = async (payload: CreateSimulationPayload): Promise<Simulation> => {
  try {
    const response = await apiClient.post('/simulations', payload);
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to create simulation');
  }
};

export const getSimulations = async (
  filters: SimulationFilters = {},
  sortOptions: SimulationSortOptions = { sort_by: 'updated_at', sort_order: 'desc' },
  page = 1,
  limit = 10
): Promise<PaginatedSimulations> => {
  try {
    const params = {
      ...filters,
      ...sortOptions,
      page,
      limit
    };

    const response = await apiClient.get('/simulations', { params });
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to fetch simulations');
  }
};

export const getMySimulations = async (
  page = 1,
  limit = 10,
  filters: Omit<SimulationFilters, 'user_id'> = {}
): Promise<PaginatedSimulations> => {
  return getSimulations(
    { ...filters, user_id: 'current' }, // Backend handles 'current' as current user
    { sort_by: 'updated_at', sort_order: 'desc' },
    page,
    limit
  );
};

export const getSharedSimulations = async (
  page = 1,
  limit = 10
): Promise<PaginatedSimulations> => {
  return getSimulations(
    { shared_with_me: true },
    { sort_by: 'updated_at', sort_order: 'desc' },
    page,
    limit
  );
};

export const getPublicSimulations = async (
  page = 1,
  limit = 10,
  search?: string
): Promise<PaginatedSimulations> => {
  return getSimulations(
    { is_public: true, search },
    { sort_by: 'updated_at', sort_order: 'desc' },
    page,
    limit
  );
};

export const getSimulationById = async (id: number): Promise<Simulation> => {
  try {
    const response = await apiClient.get(`/simulations/${id}`);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Simulation not found');
    }
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to view this simulation');
    }
    handleSimulationError(error, 'Failed to fetch simulation');
  }
};

export const updateSimulation = async (
  id: number, 
  payload: UpdateSimulationPayload
): Promise<Simulation> => {
  try {
    const response = await apiClient.put(`/simulations/${id}`, payload);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to edit this simulation');
    }
    handleSimulationError(error, 'Failed to update simulation');
  }
};

export const deleteSimulation = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/simulations/${id}`);
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to delete this simulation');
    }
    if (error.response?.status === 409) {
      throw new Error('Cannot delete simulation - it has associated data that must be removed first');
    }
    handleSimulationError(error, 'Failed to delete simulation');
  }
};

// Sharing and permissions
export const shareSimulation = async (
  id: number, 
  payload: ShareSimulationPayload
): Promise<Simulation> => {
  try {
    const response = await apiClient.post(`/simulations/${id}/share`, payload);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to share this simulation');
    }
    if (error.response?.status === 404) {
      throw new Error('User not found with that email address');
    }
    if (error.response?.status === 409) {
      throw new Error('Simulation is already shared with this user');
    }
    handleSimulationError(error, 'Failed to share simulation');
  }
};

export const updateUserPermission = async (
  id: number,
  payload: UpdatePermissionPayload
): Promise<Simulation> => {
  try {
    const response = await apiClient.put(`/simulations/${id}/permissions`, payload);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to modify permissions for this simulation');
    }
    handleSimulationError(error, 'Failed to update permissions');
  }
};

export const removeUserAccess = async (
  id: number,
  userId: number
): Promise<Simulation> => {
  try {
    const response = await apiClient.delete(`/simulations/${id}/permissions/${userId}`);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to remove access for this simulation');
    }
    handleSimulationError(error, 'Failed to remove user access');
  }
};

export const makeSimulationPublic = async (id: number): Promise<Simulation> => {
  return updateSimulation(id, { is_public: true });
};

export const makeSimulationPrivate = async (id: number): Promise<Simulation> => {
  return updateSimulation(id, { is_public: false });
};

// Simulation templates and duplication
export const duplicateSimulation = async (
  id: number,
  newName?: string
): Promise<Simulation> => {
  try {
    const response = await apiClient.post(`/simulations/${id}/duplicate`, {
      name: newName
    });
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to duplicate this simulation');
    }
    handleSimulationError(error, 'Failed to duplicate simulation');
  }
};

export const createFromTemplate = async (
  templateId: number,
  name: string,
  description?: string
): Promise<Simulation> => {
  try {
    const response = await apiClient.post(`/simulations/templates/${templateId}`, {
      name,
      description
    });
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to create simulation from template');
  }
};

// Simulation statistics and analytics
export const getSimulationStats = async (id: number) => {
  try {
    const response = await apiClient.get(`/simulations/${id}/stats`);
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to fetch simulation statistics');
  }
};

export const getUserSimulationStats = async () => {
  try {
    const response = await apiClient.get('/simulations/user/stats');
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to fetch user simulation statistics');
  }
};

// Simulation search and discovery
export const searchSimulations = async (
  query: string,
  filters: SimulationFilters = {},
  page = 1,
  limit = 10
): Promise<PaginatedSimulations> => {
  return getSimulations(
    { ...filters, search: query },
    { sort_by: 'updated_at', sort_order: 'desc' },
    page,
    limit
  );
};

export const getRecentSimulations = async (limit = 5): Promise<Simulation[]> => {
  try {
    const response = await apiClient.get('/simulations/recent', {
      params: { limit }
    });
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to fetch recent simulations');
  }
};

export const getFavoriteSimulations = async (
  page = 1,
  limit = 10
): Promise<PaginatedSimulations> => {
  try {
    const response = await apiClient.get('/simulations/favorites', {
      params: { page, limit }
    });
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to fetch favorite simulations');
  }
};

export const toggleSimulationFavorite = async (id: number): Promise<{ is_favorite: boolean }> => {
  try {
    const response = await apiClient.post(`/simulations/${id}/favorite`);
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to toggle favorite status');
  }
};

// Permission checking utilities
export const checkSimulationPermission = async (
  id: number,
  permission: 'read' | 'write' | 'delete' | 'share' | 'execute'
): Promise<boolean> => {
  try {
    const response = await apiClient.get(`/simulations/${id}/permissions/${permission}`);
    return response.data.data?.has_permission || false;
  } catch (error: any) {
    return false;
  }
};

export const getSimulationPermissions = async (id: number) => {
  try {
    const response = await apiClient.get(`/simulations/${id}/permissions`);
    return response.data.data || response.data;
  } catch (error: any) {
    handleSimulationError(error, 'Failed to fetch simulation permissions');
  }
};

// Error handling helper
function handleSimulationError(error: any, defaultMessage: string): never {
  if (error.response?.status === 401) {
    throw new Error('Authentication required. Please sign in.');
  }
  
  if (error.response?.status === 400) {
    const validationErrors = error.response.data?.errors || [];
    throw new Error(
      validationErrors.length > 0 
        ? validationErrors.map((err: any) => err.msg || err.message).join(', ')
        : error.response.data?.message || defaultMessage
    );
  }
  
  throw new Error(error.response?.data?.message || defaultMessage);
}