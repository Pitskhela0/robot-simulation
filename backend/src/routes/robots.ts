// backend/src/routes/robots.ts

import { Router } from 'express';
import {
  createRobot,
  getRobotsBySimulation,
  getRobotById,
  updateRobot,
  deleteRobot,
  getRobotCapabilities
} from '../conrollers/robotController';
import {
  createRobotValidation,
  updateRobotValidation,
  robotIdValidation,
  simulationIdValidation,
  paginationValidation,
  robotVersionValidation,
  positionConsistencyValidation,
  batteryVersionConsistencyValidation
} from '../validation/robotValidation';

const router = Router();

/**
 * @route   POST /api/simulations/:simulationId/robots
 * @desc    Add robot to simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @body    { name, version, x_position, y_position, battery_level?, status?, direction?, color? }
 */
router.post(
  '/:simulationId/robots',
  [...createRobotValidation, batteryVersionConsistencyValidation],
  createRobot
);

/**
 * @route   GET /api/simulations/:simulationId/robots
 * @desc    Get all robots for simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @query   { page?, limit? }
 */
router.get(
  '/:simulationId/robots',
  [...simulationIdValidation, ...paginationValidation],
  getRobotsBySimulation
);

/**
 * @route   GET /api/robots/:id
 * @desc    Get specific robot by ID
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.get(
  '/robots/:id',
  robotIdValidation,
  getRobotById
);

/**
 * @route   PUT /api/robots/:id
 * @desc    Update robot (position, battery, status)
 * @access  Public (will be protected later with auth)
 * @params  { id }
 * @body    { name?, version?, x_position?, y_position?, battery_level?, status?, direction?, color? }
 */
router.put(
  '/robots/:id',
  [...updateRobotValidation, positionConsistencyValidation, batteryVersionConsistencyValidation],
  updateRobot
);

/**
 * @route   DELETE /api/robots/:id
 * @desc    Remove robot
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.delete(
  '/robots/:id',
  robotIdValidation,
  deleteRobot
);

/**
 * @route   GET /api/robots/capabilities/:version
 * @desc    Get robot capabilities by version
 * @access  Public (will be protected later with auth)
 * @params  { version }
 */
router.get(
  '/robots/capabilities/:version',
  robotVersionValidation,
  getRobotCapabilities
);

export default router;