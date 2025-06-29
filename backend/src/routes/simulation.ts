// backend/src/routes/simulations.ts - Updated with sharing routes
import { Router } from 'express';
import {
  createSimulation,
  getSimulations,
  getSimulationById,
  updateSimulation,
  deleteSimulation,
  getSimulationStats
} from '../cotrollers/simulationController';
import {
  shareSimulation,
  updateUserPermissions,
  removeUserAccess,
  duplicateSimulation,
  getUserSimulationStats,
  getRecentSimulations,
  getSharedSimulations,
  checkSimulationPermission,
  getSimulationPermissions
} from '../conrollers/simulationSharingController';
import {
  createSimulationValidation,
  updateSimulationValidation,
  simulationIdValidation,
  paginationValidation,
  gridConsistencyValidation
} from '../validation/simulationValidation';
import {
  shareSimulationValidation,
  updatePermissionValidation,
  duplicateSimulationValidation,
  userIdValidation,
  permissionTypeValidation,
  recentSimulationsValidation,
  simulationFiltersValidation
} from '../validation/simulationSharingValidation';
import { authenticate } from '../middleware/auth';

const router = Router();

// Core simulation routes
/**
 * @route   POST /api/simulations
 * @desc    Create a new simulation
 * @access  Private (requires authentication)
 * @body    { name, description?, grid_width, grid_height, is_public? }
 */
router.post(
  '/',
  authenticate,
  createSimulationValidation,
  createSimulation
);

/**
 * @route   GET /api/simulations
 * @desc    Get all simulations with filtering and permissions
 * @access  Public (filtered by permissions)
 * @query   { page?, limit?, status?, search?, is_public?, shared_with_me?, user_id? }
 */
router.get(
  '/',
  [...paginationValidation, ...simulationFiltersValidation],
  getSimulations
);

/**
 * @route   GET /api/simulations/stats
 * @desc    Get global simulation statistics
 * @access  Public
 */
router.get(
  '/stats',
  getSimulationStats
);

/**
 * @route   GET /api/simulations/user/stats
 * @desc    Get user simulation statistics
 * @access  Private (requires authentication)
 */
router.get(
  '/user/stats',
  authenticate,
  getUserSimulationStats
);

/**
 * @route   GET /api/simulations/recent
 * @desc    Get recent simulations for user
 * @access  Private (requires authentication)
 * @query   { limit? }
 */
router.get(
  '/recent',
  authenticate,
  recentSimulationsValidation,
  getRecentSimulations
);

/**
 * @route   GET /api/simulations/shared
 * @desc    Get simulations shared with user
 * @access  Private (requires authentication)
 * @query   { page?, limit? }
 */
router.get(
  '/shared',
  authenticate,
  paginationValidation,
  getSharedSimulations
);

/**
 * @route   GET /api/simulations/:id
 * @desc    Get a specific simulation by ID
 * @access  Public (if public) / Private (if shared/owned)
 * @params  { id }
 */
router.get(
  '/:id',
  simulationIdValidation,
  getSimulationById
);

/**
 * @route   PUT /api/simulations/:id
 * @desc    Update a simulation
 * @access  Private (requires write permissions)
 * @params  { id }
 * @body    { name?, description?, grid_width?, grid_height?, is_public? }
 */
router.put(
  '/:id',
  authenticate,
  [...updateSimulationValidation, gridConsistencyValidation],
  updateSimulation
);

/**
 * @route   DELETE /api/simulations/:id
 * @desc    Delete a simulation
 * @access  Private (requires delete permissions)
 * @params  { id }
 */
router.delete(
  '/:id',
  authenticate,
  simulationIdValidation,
  deleteSimulation
);

// Sharing and permission routes
/**
 * @route   POST /api/simulations/:id/share
 * @desc    Share simulation with a user
 * @access  Private (requires sharing permissions)
 * @params  { id }
 * @body    { user_email, permission_level, message? }
 */
router.post(
  '/:id/share',
  authenticate,
  shareSimulationValidation,
  shareSimulation
);

/**
 * @route   PUT /api/simulations/:id/permissions
 * @desc    Update user permissions for a simulation
 * @access  Private (requires admin permissions)
 * @params  { id }
 * @body    { user_id, permission_level }
 */
router.put(
  '/:id/permissions',
  authenticate,
  updatePermissionValidation,
  updateUserPermissions
);

/**
 * @route   POST /api/simulations
 * @desc    Create a new simulation
 * @access  Public (will be protected later with auth)
 * @body    { user_id, name, description?, grid_width, grid_height, status? }
 */
router.post(
  '/',
  createSimulationValidation,
  createSimulation
);

/**
 * @route   GET /api/simulations
 * @desc    Get all simulations with pagination
 * @access  Public (will be protected later with auth)
 * @query   { page?, limit?, user_id? }
 */
router.get(
  '/',
  paginationValidation,
  getSimulations
);

/**
 * @route   GET /api/simulations/stats
 * @desc    Get simulation statistics by status
 * @access  Public (will be protected later with auth)
 */
router.get(
  '/stats',
  getSimulationStats
);

/**
 * @route   GET /api/simulations/:id
 * @desc    Get a specific simulation by ID
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.get(
  '/:id',
  simulationIdValidation,
  getSimulationById
);

/**
 * @route   PUT /api/simulations/:id
 * @desc    Update a simulation
 * @access  Public (will be protected later with auth)
 * @params  { id }
 * @body    { name?, description?, grid_width?, grid_height?, status? }
 */
router.put(
  '/:id',
  [...updateSimulationValidation, gridConsistencyValidation],
  updateSimulation
);

/**
 * @route   DELETE /api/simulations/:id
 * @desc    Delete a simulation
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.delete(
  '/:id',
  simulationIdValidation,
  deleteSimulation
);

export default router;
