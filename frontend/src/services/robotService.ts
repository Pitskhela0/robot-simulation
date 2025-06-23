// src/services/robotService.ts
import apiClient from './apiClient';
import { Robot, CreateRobotPayload } from '../types/robot';

export const createRobot = async (simulationId: number, payload: CreateRobotPayload): Promise<Robot> => {
  const response = await apiClient.post(`/simulations/${simulationId}/robots`, payload);
  return response.data.data || response.data;
};

export const getRobotsBySimulation = async (simulationId: number, page = 1, limit = 10) => {
  const response = await apiClient.get(`/simulations/${simulationId}/robots`, {
    params: { page, limit }
  });
  return response.data.data || response.data;
};

export const getRobotById = async (robotId: number): Promise<Robot> => {
  const response = await apiClient.get(`/robots/${robotId}`);
  return response.data.data || response.data;
};

export const updateRobot = async (robotId: number, payload: Partial<CreateRobotPayload>): Promise<Robot> => {
  const response = await apiClient.put(`/robots/${robotId}`, payload);
  return response.data.data || response.data;
};

export const deleteRobot = async (robotId: number): Promise<void> => {
  await apiClient.delete(`/robots/${robotId}`);
};