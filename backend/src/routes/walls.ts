// backend/src/routes/walls.ts

import { Router } from 'express';
import {
  createWall,
  createBatchWalls,
  getWallsBySimulation,
  deleteWall,
  clearAllWalls,
  checkCoordinates,
  getGridRepresentation,
  checkPath
} from '../conrollers/wallController';
import {
  createWallValidation,
  createBatchWallsValidation,
  wallIdValidation,
  simulationIdValidation,
  wallPaginationValidation,
  coordinateCheckValidation,
  pathCheckValidation,
  wallCoordinateValidation,
  batchWallDuplicateValidation
} from '../validation/wallValidation';

const router = Router();

/**
 * @route   POST /api/simulations/:simulationId/walls
 * @desc    Add wall to simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @body    { x_position, y_position, type? }
 */
router.post(
  '/:simulationId/walls',
  [...createWallValidation, wallCoordinateValidation],
  createWall
);

/**
 * @route   POST /api/simulations/:simulationId/walls/batch
 * @desc    Add multiple walls to simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @body    { walls: [{ x_position, y_position, type? }] }
 */
router.post(
  '/:simulationId/walls/batch',
  [...createBatchWallsValidation, batchWallDuplicateValidation],
  createBatchWalls
);

/**
 * @route   GET /api/simulations/:simulationId/walls
 * @desc    Get all walls for simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @query   { page?, limit? }
 */
router.get(
  '/:simulationId/walls',
  [...simulationIdValidation, ...wallPaginationValidation],
  getWallsBySimulation
);

/**
 * @route   DELETE /api/simulations/:simulationId/walls
 * @desc    Clear all walls for simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 */
router.delete(
  '/:simulationId/walls',
  simulationIdValidation,
  clearAllWalls
);

/**
 * @route   GET /api/simulations/:simulationId/walls/grid
 * @desc    Get grid representation of walls
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 */
router.get(
  '/:simulationId/walls/grid',
  simulationIdValidation,
  getGridRepresentation
);

/**
 * @route   GET /api/simulations/:simulationId/walls/check-coordinates
 * @desc    Check if coordinates are valid and available
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @query   { x, y }
 */
router.get(
  '/:simulationId/walls/check-coordinates',
  coordinateCheckValidation,
  checkCoordinates
);

/**
 * @route   GET /api/simulations/:simulationId/walls/check-path
 * @desc    Check if path between two points is clear
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @query   { fromX, fromY, toX, toY }
 */
router.get(
  '/:simulationId/walls/check-path',
  pathCheckValidation,
  checkPath
);

/**
 * @route   DELETE /api/walls/:id
 * @desc    Remove specific wall
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.delete(
  '/walls/:id',
  wallIdValidation,
  deleteWall
);

export default router;