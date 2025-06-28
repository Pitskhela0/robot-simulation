// src/services/taskService.ts
import apiClient from './apiClient';
import { Task, CreateTaskPayload } from '../types/task';

export interface TaskPaginationResponse {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const createTask = async (simulationId: number, payload: CreateTaskPayload): Promise<Task> => {
  const response = await apiClient.post(`/simulations/${simulationId}/tasks`, payload);
  return response.data.data || response.data;
};

export const getTasksBySimulation = async (
  simulationId: number, 
  page = 1, 
  limit = 10,
  status?: string
): Promise<Task[]> => {
  const params: any = { page, limit };
  if (status) params.status = status;
  
  const response = await apiClient.get(`/simulations/${simulationId}/tasks`, { params });
  return response.data.data || response.data;
};

export const getTaskById = async (taskId: number): Promise<Task> => {
  const response = await apiClient.get(`/tasks/${taskId}`);
  return response.data.data || response.data;
};

export const updateTask = async (taskId: number, payload: Partial<CreateTaskPayload>): Promise<Task> => {
  const response = await apiClient.put(`/tasks/${taskId}`, payload);
  return response.data.data || response.data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
  await apiClient.delete(`/tasks/${taskId}`);
};

export const assignTaskToRobot = async (taskId: number, robotId: number): Promise<Task> => {
  const response = await apiClient.post(`/tasks/${taskId}/assign`, { robot_id: robotId });
  return response.data.data || response.data;
};

export const getTaskStats = async (simulationId: number) => {
  const response = await apiClient.get(`/simulations/${simulationId}/tasks/stats`);
  return response.data.data || response.data;
};