// backend/src/validation/simulationSharingValidation.ts
import * as validator from 'express-validator';

const { body, param, query } = validator;
type ValidationChain = any;

// Validation for sharing simulation
export const shareSimulationValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('user_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('permission_level')
    .isIn(['read', 'write', 'admin'])
    .withMessage('Permission level must be one of: read, write, admin'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

// Validation for updating user permissions
export const updatePermissionValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('user_id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  
  body('permission_level')
    .isIn(['read', 'write', 'admin'])
    .withMessage('Permission level must be one of: read, write, admin')
];

// Validation for duplicating simulation
export const duplicateSimulationValidation: ValidationChain[] = [
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
    .withMessage('Description cannot exceed 1000 characters')
];

// Validation for simulation ID parameter
export const simulationIdValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer')
];

// Validation for user ID parameter
export const userIdValidation: ValidationChain[] = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
];

// Validation for permission type parameter
export const permissionTypeValidation: ValidationChain[] = [
  param('permission')
    .isIn(['read', 'write', 'delete', 'share', 'execute'])
    .withMessage('Permission type must be one of: read, write, delete, share, execute')
];

// Validation for recent simulations query
export const recentSimulationsValidation: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
    .toInt()
];

// Validation for pagination
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

// Validation for simulation filters
export const simulationFiltersValidation: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(['created', 'running', 'paused', 'completed', 'failed'])
    .withMessage('Status must be one of: created, running, paused, completed, failed'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be a boolean value')
    .toBoolean(),
  
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('date_from must be a valid ISO 8601 date'),
  
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('date_to must be a valid ISO 8601 date')
];

// Validation for bulk sharing
export const bulkShareValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('user_emails')
    .isArray({ min: 1, max: 10 })
    .withMessage('user_emails must be an array with 1-10 email addresses'),
  
  body('user_emails.*')
    .isEmail()
    .normalizeEmail()
    .withMessage('All emails must be valid email addresses'),
  
  body('permission_level')
    .isIn(['read', 'write', 'admin'])
    .withMessage('Permission level must be one of: read, write, admin'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

// Validation for updating simulation publicity
export const updatePublicityValidation: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Simulation ID must be a positive integer'),
  
  body('is_public')
    .isBoolean()
    .withMessage('is_public must be a boolean value')
];

// Validation for advanced simulation search
export const advancedSearchValidation: ValidationChain[] = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  
  query('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  query('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),
  
  query('min_robots')
    .optional()
    .isInt({ min: 0 })
    .withMessage('min_robots must be a non-negative integer')
    .toInt(),
  
  query('max_robots')
    .optional()
    .isInt({ min: 0 })
    .withMessage('max_robots must be a non-negative integer')
    .toInt(),
  
  query('min_tasks')
    .optional()
    .isInt({ min: 0 })
    .withMessage('min_tasks must be a non-negative integer')
    .toInt(),
  
  query('max_tasks')
    .optional()
    .isInt({ min: 0 })
    .withMessage('max_tasks must be a non-negative integer')
    .toInt(),
  
  query('grid_size')
    .optional()
    .matches(/^\d+x\d+$/)
    .withMessage('grid_size must be in format "WIDTHxHEIGHT" (e.g., "10x10")'),
  
  query('created_by')
    .optional()
    .isInt({ min: 1 })
    .withMessage('created_by must be a positive integer (user ID)')
    .toInt(),
  
  query('sort_by')
    .optional()
    .isIn(['created_at', 'updated_at', 'name', 'status', 'popularity'])
    .withMessage('sort_by must be one of: created_at, updated_at, name, status, popularity'),
  
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('sort_order must be either "asc" or "desc"')
];

// Custom validation for ensuring user cannot share with themselves
export const preventSelfShareValidation: ValidationChain = body('user_email').custom(async (email, { req }) => {
  if (req.user?.email === email) {
    throw new Error('Cannot share simulation with yourself');
  }
  return true;
});

// Custom validation for permission hierarchy
export const permissionHierarchyValidation: ValidationChain = body().custom((value, { req }) => {
  const { permission_level } = req.body;
  const currentUserPermission = req.userPermission; // This would be set by middleware
  
  // Only owners and admins can grant admin permissions
  if (permission_level === 'admin' && (!currentUserPermission || currentUserPermission !== 'admin')) {
    throw new Error('Only simulation owners and admins can grant admin permissions');
  }
  
  return true;
});

// Custom validation for date range
export const dateRangeValidation: ValidationChain = query().custom((value, { req }) => {
  const { date_from, date_to } = req.query;
  
  if (date_from && date_to) {
    const fromDate = new Date(date_from as string);
    const toDate = new Date(date_to as string);
    
    if (fromDate > toDate) {
      throw new Error('date_from must be before date_to');
    }
    
    // Limit date range to prevent performance issues
    const daysDiff = Math.abs(toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      throw new Error('Date range cannot exceed 365 days');
    }
  }
  
  return true;
});

// Custom validation for robot/task min/max ranges
export const minMaxRangeValidation: ValidationChain = query().custom((value, { req }) => {
  const { min_robots, max_robots, min_tasks, max_tasks } = req.query;
  
  if (min_robots && max_robots && min_robots > max_robots) {
    throw new Error('min_robots cannot be greater than max_robots');
  }
  
  if (min_tasks && max_tasks && min_tasks > max_tasks) {
    throw new Error('min_tasks cannot be greater than max_tasks');
  }
  
  return true;
});