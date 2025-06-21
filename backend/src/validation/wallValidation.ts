// backend/src/validation/wallValidation.ts

import * as validator from 'express-validator';
import { WallType } from '../models/Wall';

const { body, param, query } = validator;
type ValidationChain = any; // Use any for now to avoid TypeScript issues

// Validation for creating a wall
export const createWallValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('x_position')
    .isInt({ min: 0 })
    .withMessage('X position must be a non-negative integer'),
  
  body('y_position')
    .isInt({ min: 0 })
    .withMessage('Y position must be a non-negative integer'),
  
  body('type')
    .optional()
    .isIn(Object.values(WallType))
    .withMessage(`Wall type must be one of: ${Object.values(WallType).join(', ')}`)
];

// Validation for batch wall creation
export const createBatchWallsValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('walls')
    .isArray({ min: 1, max: 100 })
    .withMessage('Walls must be an array with 1-100 items'),
  
  body('walls.*.x_position')
    .isInt({ min: 0 })
    .withMessage('Each wall x_position must be a non-negative integer'),
  
  body('walls.*.y_position')
    .isInt({ min: 0 })
    .withMessage('Each wall y_position must be a non-negative integer'),
  
  body('walls.*.type')
    .optional()
    .isIn(Object.values(WallType))
    .withMessage(`Each wall type must be one of: ${Object.values(WallType).join(', ')}`)
];

// Validation for wall ID parameter
export const wallIdValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Wall ID must be a positive integer')
];

// Validation for simulation ID parameter
export const simulationIdValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer')
];

// Validation for pagination query parameters
export const wallPaginationValidation: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
    .toInt()
];

// Validation for coordinate checking
export const coordinateCheckValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  query('x')
    .isInt({ min: 0 })
    .withMessage('X coordinate must be a non-negative integer')
    .toInt(),
  
  query('y')
    .isInt({ min: 0 })
    .withMessage('Y coordinate must be a non-negative integer')
    .toInt()
];

// Validation for path checking
export const pathCheckValidation: ValidationChain[] = [
  param('simulationId')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  query('fromX')
    .isInt({ min: 0 })
    .withMessage('From X coordinate must be a non-negative integer')
    .toInt(),
  
  query('fromY')
    .isInt({ min: 0 })
    .withMessage('From Y coordinate must be a non-negative integer')
    .toInt(),
  
  query('toX')
    .isInt({ min: 0 })
    .withMessage('To X coordinate must be a non-negative integer')
    .toInt(),
  
  query('toY')
    .isInt({ min: 0 })
    .withMessage('To Y coordinate must be a non-negative integer')
    .toInt()
];

// Custom validation for wall coordinates consistency
export const wallCoordinateValidation: ValidationChain = body().custom((value, { req }) => {
  const { x_position, y_position } = req.body;
  
  // Basic coordinate validation
  if (x_position === y_position && x_position === 0) {
    throw new Error('Cannot place wall at base station coordinates (0, 0)');
  }
  
  return true;
});

// Custom validation for batch walls to check for duplicates
export const batchWallDuplicateValidation: ValidationChain = body('walls').custom((walls, { req }) => {
  if (!Array.isArray(walls)) {
    return true; // Let the array validation handle this
  }

  const coordinateSet = new Set<string>();
  const duplicates: string[] = [];

  walls.forEach((wall: any, index: number) => {
    if (wall.x_position !== undefined && wall.y_position !== undefined) {
      const coordKey = `${wall.x_position},${wall.y_position}`;
      if (coordinateSet.has(coordKey)) {
        duplicates.push(`Duplicate coordinates (${wall.x_position}, ${wall.y_position}) at index ${index}`);
      } else {
        coordinateSet.add(coordKey);
      }
    }
  });

  if (duplicates.length > 0) {
    throw new Error(`Duplicate coordinates found: ${duplicates.join('; ')}`);
  }

  return true;
});