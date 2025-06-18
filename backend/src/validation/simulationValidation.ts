// backend/src/validation/simulationValidation.ts

import * as validator from 'express-validator';

const { body, param, query } = validator;
type ValidationChain = any; // Use any for now to avoid TypeScript issues

// Validation for creating a simulation
export const createSimulationValidation: ValidationChain[] = [
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('grid_width')
    .isInt({ min: 5, max: 100 })
    .withMessage('Grid width must be between 5 and 100'),
  
  body('grid_height')
    .isInt({ min: 5, max: 100 })
    .withMessage('Grid height must be between 5 and 100'),
  
  body('status')
    .optional()
    .isIn(['created', 'running', 'paused', 'completed', 'failed'])
    .withMessage('Status must be one of: created, running, paused, completed, failed')
];

// Validation for updating a simulation
export const updateSimulationValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('grid_width')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Grid width must be between 5 and 100'),
  
  body('grid_height')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Grid height must be between 5 and 100'),
  
  body('status')
    .optional()
    .isIn(['created', 'running', 'paused', 'completed', 'failed'])
    .withMessage('Status must be one of: created, running, paused, completed, failed'),
  
  // Custom validation to ensure at least one field is provided
  body().custom((value, { req }) => {
    const allowedFields = ['name', 'description', 'grid_width', 'grid_height', 'status'];
    const providedFields = Object.keys(req.body).filter(key => allowedFields.includes(key));
    
    if (providedFields.length === 0) {
      throw new Error('At least one field must be provided for update');
    }
    
    return true;
  })
];

// Validation for simulation ID parameter
export const simulationIdValidation: ValidationChain[] = [
  param('id')
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
    .toInt(),
  
  query('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
    .toInt()
];

// Validation for coordinate parameters (for future use)
export const coordinateValidation = (gridWidthField: string, gridHeightField: string) => [
  body('x')
    .isInt({ min: 0 })
    .withMessage('X coordinate must be a non-negative integer')
    .custom((value, { req }) => {
      const gridWidth = req.body[gridWidthField];
      if (gridWidth && value >= gridWidth) {
        throw new Error(`X coordinate must be less than grid width (${gridWidth})`);
      }
      return true;
    }),
  
  body('y')
    .isInt({ min: 0 })
    .withMessage('Y coordinate must be a non-negative integer')
    .custom((value, { req }) => {
      const gridHeight = req.body[gridHeightField];
      if (gridHeight && value >= gridHeight) {
        throw new Error(`Y coordinate must be less than grid height (${gridHeight})`);
      }
      return true;
    })
];

// Custom validation for grid dimension consistency
export const gridConsistencyValidation: ValidationChain = body().custom((value, { req }) => {
  const { grid_width, grid_height } = req.body;
  
  // Validate that both dimensions are provided together if updating grid
  if ((grid_width && !grid_height) || (!grid_width && grid_height)) {
    throw new Error('Both grid_width and grid_height must be provided when updating grid dimensions');
  }
  
  return true;
});