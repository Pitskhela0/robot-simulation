// src/services/simulationService.ts
import apiClient from './apiClient';
import { Simulation } from '../types/entities'; // Make sure this is imported

// Define the type for the request body
interface CreateSimulationPayload {
  name: string;
  grid_width: number;
  grid_height: number;
}

// This is the new function to add
export const createSimulation = async (payload: CreateSimulationPayload): Promise<Simulation> => {
  const response = await apiClient.post('/simulations', payload);
  return response.data;
};