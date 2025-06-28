// src/services/simulationService.ts - Updated with authentication
import apiClient from './apiClient';
import { Simulation } from '../types/entities';

interface CreateSimulationPayload {
  name: string;
  grid_width: number;
  grid_height: number;
  description?: string;
}

export interface UpdateSimulationPayload {
  name?: string;
  grid_width?: number;
  grid_height?: number;
  description?: string;
  base_station_x?: number | null;
  base_station_y?: number | null;
}

export const createSimulation = async (payload: CreateSimulationPayload): Promise<Simulation> => {
  try {
    const response = await apiClient.post('/simulations', payload);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to create simulations.');
    }
    
    if (error.response?.status === 400) {
      const validationErrors = error.response.data?.errors || [];
      throw new Error(
        validationErrors.length > 0 
          ? validationErrors.map((err: any) => err.msg || err.message).join(', ')
          : 'Invalid simulation data'
      );
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to create simulation'
    );
  }
};

export const getSimulations = async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get('/simulations', {
      params: { page, limit }
    });
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to fetch simulations'
    );
  }
};

export const getSimulationById = async (id: number): Promise<Simulation> => {
  try {
    const response = await apiClient.get(`/simulations/${id}`);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Simulation not found');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to view this simulation.');
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to fetch simulation'
    );
  }
};

export const updateSimulation = async (
  id: number, 
  payload: Partial<UpdateSimulationPayload>
): Promise<Simulation> => {
  try {
    const response = await apiClient.put(`/simulations/${id}`, payload);
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Simulation not found');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to update this simulation.');
    }
    
    if (error.response?.status === 400) {
      const validationErrors = error.response.data?.errors || [];
      throw new Error(
        validationErrors.length > 0 
          ? validationErrors.map((err: any) => err.msg || err.message).join(', ')
          : 'Invalid simulation data'
      );
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to update simulation'
    );
  }
};

export const deleteSimulation = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/simulations/${id}`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Simulation not found');
    }
    
    if (error.response?.status === 403) {
      throw new Error('You do not have permission to delete this simulation.');
    }
    
    if (error.response?.status === 409) {
      throw new Error('Cannot delete simulation - it has associated data that must be removed first.');
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to delete simulation'
    );
  }
};

export const getUserSimulations = async (page = 1, limit = 10) => {
  try {
    const response = await apiClient.get('/simulations', {
      params: { page, limit, user_only: true }
    });
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to fetch your simulations'
    );
  }
};

export const getSimulationStats = async () => {
  try {
    const response = await apiClient.get('/simulations/stats');
    return response.data.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in.');
    }
    
    throw new Error(
      error.response?.data?.message || 'Failed to fetch simulation statistics'
    );
  }
};