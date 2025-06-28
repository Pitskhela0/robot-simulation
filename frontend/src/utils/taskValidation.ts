// src/utils/taskValidation.ts
import { TaskType } from '../types/task';
import { ValidationResult } from './validation';

/**
 * Validates task coordinates within grid bounds
 * @param x X coordinate
 * @param y Y coordinate
 * @param gridWidth Grid width
 * @param gridHeight Grid height
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskCoordinates = (
  x: number,
  y: number,
  gridWidth: number,
  gridHeight: number
): ValidationResult => {
  const errors: string[] = [];
  
  if (!Number.isInteger(x) || x < 0) {
    errors.push('X coordinate must be a non-negative integer');
  }
  
  if (!Number.isInteger(y) || y < 0) {
    errors.push('Y coordinate must be a non-negative integer');
  }
  
  if (x >= gridWidth) {
    errors.push(`X coordinate must be less than ${gridWidth}`);
  }
  
  if (y >= gridHeight) {
    errors.push(`Y coordinate must be less than ${gridHeight}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates task priority
 * @param priority Task priority (1-10)
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskPriority = (priority: number): ValidationResult => {
  const errors: string[] = [];
  
  if (!Number.isInteger(priority)) {
    errors.push('Priority must be a whole number');
  }
  
  if (priority < 1 || priority > 10) {
    errors.push('Priority must be between 1 and 10');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates task description
 * @param description Task description
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskDescription = (description: string): ValidationResult => {
  const errors: string[] = [];
  
  if (description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates task type
 * @param type Task type
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskType = (type: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!Object.values(TaskType).includes(type as TaskType)) {
    errors.push('Invalid task type selected');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates complete task form data
 * @param formData Task form data
 * @param gridWidth Grid width
 * @param gridHeight Grid height
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskForm = (
  formData: {
    type: string;
    target_x: number;
    target_y: number;
    priority: number;
    description?: string;
  },
  gridWidth: number,
  gridHeight: number
): ValidationResult => {
  const typeValidation = validateTaskType(formData.type);
  const coordinateValidation = validateTaskCoordinates(
    formData.target_x,
    formData.target_y,
    gridWidth,
    gridHeight
  );
  const priorityValidation = validateTaskPriority(formData.priority);
  const descriptionValidation = validateTaskDescription(formData.description || '');
  
  const allErrors = [
    ...typeValidation.errors,
    ...coordinateValidation.errors,
    ...priorityValidation.errors,
    ...descriptionValidation.errors
  ];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Checks if task coordinates conflict with existing entities
 * @param x X coordinate
 * @param y Y coordinate
 * @param baseStation Base station coordinates
 * @param robots Robot positions
 * @param walls Wall positions
 * @returns Validation result with conflict information
 */
export const validateTaskPlacement = (
  x: number,
  y: number,
  baseStation: { x: number; y: number } | null,
  robots: Array<{ x_position: number; y_position: number }>,
  walls: Array<{ x_position: number; y_position: number }>
): ValidationResult => {
  const errors: string[] = [];
  
  // Check base station conflict
  if (baseStation && baseStation.x === x && baseStation.y === y) {
    errors.push('Cannot place task at base station location');
  }
  
  // Check robot conflicts
  const robotAtLocation = robots.find(robot => robot.x_position === x && robot.y_position === y);
  if (robotAtLocation) {
    errors.push('Cannot place task where robot is currently located');
  }
  
  // Check wall conflicts
  const wallAtLocation = walls.find(wall => wall.x_position === x && wall.y_position === y);
  if (wallAtLocation) {
    errors.push('Cannot place task on a wall');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};