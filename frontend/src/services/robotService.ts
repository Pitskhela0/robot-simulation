// src/services/robotService.ts (Enhanced with error handling)
import apiClient from './apiClient';
import { Robot, CreateRobotPayload, RobotVersion, ROBOT_CAPABILITIES } from '../types/robot';

// Custom error types
export class RobotServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'RobotServiceError';
  }
}

export class ValidationError extends RobotServiceError {
  constructor(message: string, public validationErrors?: string[]) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

// Enhanced API functions with better error handling
export const createRobot = async (simulationId: number, payload: CreateRobotPayload): Promise<Robot> => {
  try {
    // Validate payload before sending
    validateCreateRobotPayload(payload);
    
    const response = await apiClient.post(`/simulations/${simulationId}/robots`, payload);
    
    // Add capabilities to the response
    // FIX: Explicitly type the response data as 'Robot'
    const robot: Robot = response.data.data || response.data;
    robot.capabilities = ROBOT_CAPABILITIES[robot.version];
    
    return robot;
  } catch (error: any) {
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.message || 'Invalid robot data';
      const validationErrors = error.response.data?.errors || [];
      throw new ValidationError(errorMessage, validationErrors);
    }
    
    if (error.response?.status === 404) {
      throw new RobotServiceError('Simulation not found', 404, error);
    }
    
    if (error.response?.status >= 500) {
      throw new RobotServiceError('Server error occurred', error.response.status, error);
    }
    
    throw new RobotServiceError(
      error.message || 'Failed to create robot',
      error.response?.status,
      error
    );
  }
};

export const getRobotsBySimulation = async (
  simulationId: number, 
  page = 1, 
  limit = 10
): Promise<Robot[]> => {
  try {
    const response = await apiClient.get(`/simulations/${simulationId}/robots`, {
      params: { page, limit }
    });
    
    // FIX: Explicitly type the response data as 'Robot[]'
    const robots: Robot[] = response.data.data || response.data;
    
    // Add capabilities to each robot
    return robots.map((robot: Robot) => ({
      ...robot,
      capabilities: ROBOT_CAPABILITIES[robot.version]
    }));
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new RobotServiceError('Simulation not found', 404, error);
    }
    
    throw new RobotServiceError(
      error.message || 'Failed to fetch robots',
      error.response?.status,
      error
    );
  }
};

export const getRobotById = async (robotId: number): Promise<Robot> => {
  try {
    const response = await apiClient.get(`/robots/${robotId}`);
    // FIX: Explicitly type the response data as 'Robot'
    const robot: Robot = response.data.data || response.data;
    
    // Add capabilities
    robot.capabilities = ROBOT_CAPABILITIES[robot.version];
    
    return robot;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new RobotServiceError('Robot not found', 404, error);
    }
    
    throw new RobotServiceError(
      error.message || 'Failed to fetch robot',
      error.response?.status,
      error
    );
  }
};

export const updateRobot = async (
  robotId: number, 
  payload: Partial<CreateRobotPayload>
): Promise<Robot> => {
  try {
    // Validate update payload
    validateUpdateRobotPayload(payload);
    
    const response = await apiClient.put(`/robots/${robotId}`, payload);
    // FIX: Explicitly type the response data as 'Robot'
    const robot: Robot = response.data.data || response.data;
    
    // Add capabilities
    robot.capabilities = ROBOT_CAPABILITIES[robot.version];
    
    return robot;
  } catch (error: any) {
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.message || 'Invalid robot data';
      const validationErrors = error.response.data?.errors || [];
      throw new ValidationError(errorMessage, validationErrors);
    }
    
    if (error.response?.status === 404) {
      throw new RobotServiceError('Robot not found', 404, error);
    }
    
    throw new RobotServiceError(
      error.message || 'Failed to update robot',
      error.response?.status,
      error
    );
  }
};

export const deleteRobot = async (robotId: number): Promise<void> => {
  try {
    await apiClient.delete(`/robots/${robotId}`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new RobotServiceError('Robot not found', 404, error);
    }
    
    if (error.response?.status === 409) {
      throw new RobotServiceError(
        'Cannot delete robot - it has associated data',
        409,
        error
      );
    }
    
    throw new RobotServiceError(
      error.message || 'Failed to delete robot',
      error.response?.status,
      error
    );
  }
};

export const getRobotCapabilities = async (version: RobotVersion) => {
  try {
    const response = await apiClient.get(`/robots/capabilities/${version}`);
    return response.data.data || response.data;
  } catch (error: any) {
    // Fallback to local capabilities if API fails
    return {
      version,
      capabilities: ROBOT_CAPABILITIES[version]
    };
  }
};

// Validation functions
const validateCreateRobotPayload = (payload: CreateRobotPayload): void => {
  const errors: string[] = [];
  
  if (!payload.name?.trim()) {
    errors.push('Robot name is required');
  }
  
  if (payload.name && payload.name.length > 100) {
    errors.push('Robot name must be less than 100 characters');
  }
  
  // FIX: Validate version first to prevent runtime errors in subsequent checks
  const isVersionValid = Object.values(RobotVersion).includes(payload.version);
  if (!isVersionValid) {
    errors.push('Invalid robot version');
  }
  
  if (payload.x_position < 0 || payload.y_position < 0) {
    errors.push('Position coordinates must be non-negative');
  }
  
  // FIX: Only check battery level if the version is valid
  if (isVersionValid && payload.battery_level !== undefined) {
    const maxCapacity = ROBOT_CAPABILITIES[payload.version].batteryCapacity;
    if (payload.battery_level < 0 || payload.battery_level > maxCapacity) {
      errors.push(`Battery level must be between 0 and ${maxCapacity}`);
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
};

const validateUpdateRobotPayload = (payload: Partial<CreateRobotPayload>): void => {
  const errors: string[] = [];
  
  if (payload.name !== undefined && !payload.name.trim()) {
    errors.push('Robot name cannot be empty');
  }
  
  if (payload.name && payload.name.length > 100) {
    errors.push('Robot name must be less than 100 characters');
  }
  
  if (payload.version && !Object.values(RobotVersion).includes(payload.version)) {
    errors.push('Invalid robot version');
  }
  
  if (payload.x_position !== undefined && payload.x_position < 0) {
    errors.push('X position must be non-negative');
  }
  
  if (payload.y_position !== undefined && payload.y_position < 0) {
    errors.push('Y position must be non-negative');
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
};

// Helper function to check if error is retryable
export const isRetryableError = (error: RobotServiceError): boolean => {
  return (error.statusCode || 0) >= 500 || error.statusCode === 0; // Network errors
};

// Helper function to get user-friendly error message
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ValidationError) {
    return error.validationErrors?.join(', ') || error.message;
  }
  
  if (error instanceof RobotServiceError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};