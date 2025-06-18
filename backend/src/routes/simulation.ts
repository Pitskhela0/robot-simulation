// backend/src/routes/simulations.ts

import { Router } from 'express';
import {
  createSimulation,
  getSimulations,
  getSimulationById,
  updateSimulation,
  deleteSimulation,
  getSimulationStats
} from '../conrollers/simulationController';
import {
  createSimulationValidation,
  updateSimulationValidation,
  simulationIdValidation,
  paginationValidation,
  gridConsistencyValidation
} from '../validation/simulationValidation';

const router = Router();

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