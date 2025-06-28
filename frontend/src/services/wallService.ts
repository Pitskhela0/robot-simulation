// src/services/wallService.ts
import apiClient from './apiClient';

export interface Wall {
  id: number;
  simulation_id: number;
  x_position: number;
  y_position: number;
  type: string;
  created_at: string;
}

export interface CreateWallPayload {
  x_position: number;
  y_position: number;
  type?: string;
}

export interface CreateBatchWallsPayload {
  walls: CreateWallPayload[];
}

export interface BatchWallsResponse {
  walls: Wall[];
  count: number;
}

export const createWall = async (simulationId: number, payload: CreateWallPayload): Promise<Wall> => {
  const response = await apiClient.post(`/simulations/${simulationId}/walls`, payload);
  return response.data.data || response.data;
};

export const createBatchWalls = async (simulationId: number, payload: CreateBatchWallsPayload): Promise<BatchWallsResponse> => {
  const response = await apiClient.post(`/simulations/${simulationId}/walls/batch`, payload);
  return response.data.data || response.data;
};

export const getWallsBySimulation = async (simulationId: number, page?: number, limit?: number): Promise<Wall[]> => {
  const params = page && limit ? { page, limit } : {};
  const response = await apiClient.get(`/simulations/${simulationId}/walls`, { params });
  return response.data.data || response.data;
};

export const deleteWall = async (wallId: number): Promise<void> => {
  await apiClient.delete(`/walls/${wallId}`);
};

export const clearAllWalls = async (simulationId: number): Promise<{ deletedCount: number }> => {
  const response = await apiClient.delete(`/simulations/${simulationId}/walls`);
  return response.data.data || response.data;
};

export const checkCoordinates = async (simulationId: number, x: number, y: number) => {
  const response = await apiClient.get(`/simulations/${simulationId}/walls/check-coordinates`, {
    params: { x, y }
  });
  return response.data.data || response.data;
};

export const checkPath = async (simulationId: number, fromX: number, fromY: number, toX: number, toY: number) => {
  const response = await apiClient.get(`/simulations/${simulationId}/walls/check-path`, {
    params: { fromX, fromY, toX, toY }
  });
  return response.data.data || response.data;
};

export const getGridRepresentation = async (simulationId: number) => {
  const response = await apiClient.get(`/simulations/${simulationId}/walls/grid`);
  return response.data.data || response.data;
};