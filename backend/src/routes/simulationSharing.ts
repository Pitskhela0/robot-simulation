// backend/src/routes/simulationSharing.ts
import { Router } from 'express';
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
} from '../controllers/simulationSharingController';
import {
  shareSimulationValidation,
  updatePermissionValidation,
  duplicateSimulationValidation,
  simulationIdValidation,
  userIdValidation,
  permissionTypeValidation,
  recentSimulationsValidation
} from '../validation/simulationSharingValidation';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /api/simulations/:id/share
 * @desc    Share simulation with a user
 * @access  Private (requires authentication and sharing permissions)
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
 * @access  Private (requires authentication and admin permissions)
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
 * @route   DELETE /api/simulations/:id/permissions/:userId
 * @desc    Remove user access from simulation
 * @access  Private (requires authentication and admin permissions)
 * @params  { id, userId }
 */
router.delete(
  '/:id/permissions/:userId',
  authenticate,
  [...simulationIdValidation, ...userIdValidation],
  removeUserAccess
);

/**
 * @route   POST /api/simulations/:id/duplicate
 * @desc    Duplicate a simulation
 * @access  Private (requires authentication and read permissions)
 * @params  { id }
 * @body    { name?, description? }
 */
router.post(
  '/:id/duplicate',
  authenticate,
  duplicateSimulationValidation,
  duplicateSimulation
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
  getSharedSimulations
);

/**
 * @route   GET /api/simulations/:id/permissions/:permission
 * @desc    Check specific permission for user on simulation
 * @access  Private (requires authentication)
 * @params  { id, permission }
 */
router.get(
  '/:id/permissions/:permission',
  authenticate,
  [...simulationIdValidation, ...permissionTypeValidation],
  checkSimulationPermission
);

/**
 * @route   GET /api/simulations/:id/permissions
 * @desc    Get all permissions for user on simulation
 * @access  Private (requires authentication)
 * @params  { id }
 */
router.get(
  '/:id/permissions',
  authenticate,
  simulationIdValidation,
  getSimulationPermissions
);

export default router;