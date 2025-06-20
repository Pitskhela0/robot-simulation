// backend/src/validation/taskValidation.ts

import * as validator from 'express-validator';
import { TaskType, TaskStatus } from '../models/Task';

const { body, param, query } = validator;
type ValidationChain = any; // Use any for now to avoid TypeScript issues

// Validation for creating a task
export const createTaskValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('type')
    .isIn(Object.values(TaskType))
    .withMessage(`Task type must be one of: ${Object.values(TaskType).join(', ')}`),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('target_x')
    .isInt({ min: 0 })
    .withMessage('Target X coordinate must be a non-negative integer'),
  
  body('target_y')
    .isInt({ min: 0 })
    .withMessage('Target Y coordinate must be a non-negative integer'),
  
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  
  body('robot_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Robot ID must be a positive integer'),
  
  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`)
];

// Validation for updating a task
export const updateTaskValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),
  
  body('type')
    .optional()
    .isIn(Object.values(TaskType))
    .withMessage(`Task type must be one of: ${Object.values(TaskType).join(', ')}`),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('target_x')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Target X coordinate must be a non-negative integer'),
  
  body('target_y')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Target Y coordinate must be a non-negative integer'),
  
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  
  body('robot_id')
    .optional()
    .custom((value) => {
      if (value === null) return true; // Allow null to unassign
      return Number.isInteger(value) && value > 0;
    })
    .withMessage('Robot ID must be a positive integer or null'),
  
  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`),
  
  // Custom validation to ensure at least one field is provided
  body().custom((value, { req }) => {
    const allowedFields = ['type', 'description', 'target_x', 'target_y', 'priority', 'robot_id', 'status'];
    const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      throw new Error('At least one field must be provided for update');
    }
    
    return true;
  })
];

// Validation for task ID parameter
export const taskIdValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer')
];

// Validation for simulation ID parameter
export const simulationIdValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer')
];

// Validation for pagination and filtering
export const taskPaginationValidation: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(`Status filter must be one of: ${Object.values(TaskStatus).join(', ')}`)
];

// Validation for task assignment
export const taskAssignmentValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Task ID must be a positive integer'),
  
  body('robot_id')
    .isInt({ min: 1 })
    .withMessage('Robot ID must be a positive integer')
];

// Custom validation for coordinate consistency
export const coordinateConsistencyValidation: ValidationChain = body().custom((value, { req }) => {
  const { target_x, target_y } = req.body;
  
  // If one coordinate is provided, both should be provided
  if ((target_x !== undefined && target_y === undefined) || 
      (target_x === undefined && target_y !== undefined)) {
    throw new Error('Both target_x and target_y must be provided when updating coordinates');
  }
  
  return true;
});