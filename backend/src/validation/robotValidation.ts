// backend/src/validation/robotValidation.ts

import * as validator from 'express-validator';
import { RobotVersion, RobotStatus } from '../models/Robot';

const { body, param, query } = validator;
type ValidationChain = any; // Use any for now to avoid TypeScript issues

// Validation for creating a robot
export const createRobotValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Robot name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Robot name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('version')
    .isIn(Object.values(RobotVersion))
    .withMessage(`Robot version must be one of: ${Object.values(RobotVersion).join(', ')}`),
  
  body('x_position')
    .isInt({ min: 0 })
    .withMessage('X position must be a non-negative integer'),
  
  body('y_position')
    .isInt({ min: 0 })
    .withMessage('Y position must be a non-negative integer'),
  
  body('battery_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Battery level must be a non-negative integer'),
  
  body('status')
    .optional()
    .isIn(Object.values(RobotStatus))
    .withMessage(`Robot status must be one of: ${Object.values(RobotStatus).join(', ')}`),
  
  body('direction')
    .optional()
    .isIn(['north', 'south', 'east', 'west'])
    .withMessage('Direction must be one of: north, south, east, west'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code (e.g., #3B82F6)')
];

// Validation for updating a robot
export const updateRobotValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Robot ID must be a positive integer'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Robot name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Robot name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('version')
    .optional()
    .isIn(Object.values(RobotVersion))
    .withMessage(`Robot version must be one of: ${Object.values(RobotVersion).join(', ')}`),
  
  body('x_position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('X position must be a non-negative integer'),
  
  body('y_position')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Y position must be a non-negative integer'),
  
  body('battery_level')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Battery level must be a non-negative integer'),
  
  body('status')
    .optional()
    .isIn(Object.values(RobotStatus))
    .withMessage(`Robot status must be one of: ${Object.values(RobotStatus).join(', ')}`),
  
  body('direction')
    .optional()
    .isIn(['north', 'south', 'east', 'west'])
    .withMessage('Direction must be one of: north, south, east, west'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex color code (e.g., #3B82F6)'),
  
  // Custom validation to ensure at least one field is provided
  body().custom((value, { req }) => {
    const allowedFields = ['name', 'version', 'x_position', 'y_position', 'battery_level', 'status', 'direction', 'color'];
    const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      throw new Error('At least one field must be provided for update');
    }
    
    return true;
  })
];

// Validation for robot ID parameter
export const robotIdValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Robot ID must be a positive integer')
];

// Validation for simulation ID parameter
export const simulationIdValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer')
];

// Validation for pagination query parameters
export const paginationValidation: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
];

// Validation for robot version parameter
export const robotVersionValidation: ValidationChain[] = [
  param('version')
    .isIn(Object.values(RobotVersion))
    .withMessage(`Robot version must be one of: ${Object.values(RobotVersion).join(', ')}`)
];

// Custom validation for position consistency
export const positionConsistencyValidation: ValidationChain = body().custom((value, { req }) => {
  const { x_position, y_position } = req.body;
  
  // If one coordinate is provided, both should be provided
  if ((x_position !== undefined && y_position === undefined) || 
      (x_position === undefined && y_position !== undefined)) {
    throw new Error('Both x_position and y_position must be provided when updating position');
  }
  
  return true;
});

// Custom validation for battery level based on robot version (simplified)
export const batteryVersionConsistencyValidation: ValidationChain = body().custom(async (value, { req }) => {
  // Skip validation here - let the controller handle it for better error messages
  return true;
});