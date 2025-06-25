// src/services/simulationService.ts
import apiClient from './apiClient';
import { Simulation } from '../types/entities';

interface CreateSimulationPayload {
  name: string;
  grid_width: number;
  grid_height: number;
  user_id?: number; // Make optional for now, default to 1
}

export const createSimulation = async (payload: CreateSimulationPayload): Promise<Simulation> => {
  // Add default user_id if not provided
  const requestPayload = {
    ...payload,
    user_id: payload.user_id || 38, // Default to user ID 1 for now
  };
  
  const response = await apiClient.post('/simulations', requestPayload);
  return response.data;
};

export const getSimulations = async (page = 1, limit = 10) => {
  const response = await apiClient.get('/simulations', {
    params: { page, limit }
  });
  return response.data;
};

export const getSimulationById = async (id: number): Promise<Simulation> => {
  const response = await apiClient.get(`/simulations/${id}`);
  return response.data;
};

export const updateSimulation = async (id: number, payload: Partial<CreateSimulationPayload>): Promise<Simulation> => {
  const response = await apiClient.put(`/simulations/${id}`, payload);
  return response.data;
};

export const deleteSimulation = async (id: number): Promise<void> => {
  await apiClient.delete(`/simulations/${id}`);
};