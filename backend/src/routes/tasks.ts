// backend/src/routes/tasks.ts

import { Router } from 'express';
import {
  createTask,
  getTasksBySimulation,
  getTaskById,
  updateTask,
  deleteTask,
  assignTaskToRobot,
  getTaskStats
} from '../conrollers/taskController';
import {
  createTaskValidation,
  updateTaskValidation,
  taskIdValidation,
  simulationIdValidation,
  taskPaginationValidation,
  taskAssignmentValidation,
  coordinateConsistencyValidation
} from '../validation/taskValidation';

const router = Router();

/**
 * @route   POST /api/simulations/:simulationId/tasks
 * @desc    Add task to simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @body    { type, description?, target_x, target_y, priority?, robot_id?, status? }
 */
router.post(
  '/:simulationId/tasks',
  [...createTaskValidation, coordinateConsistencyValidation],
  createTask
);

/**
 * @route   GET /api/simulations/:simulationId/tasks
 * @desc    Get all tasks for simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 * @query   { page?, limit?, status? }
 */
router.get(
  '/:simulationId/tasks',
  [...simulationIdValidation, ...taskPaginationValidation],
  getTasksBySimulation
);

/**
 * @route   GET /api/simulations/:simulationId/tasks/stats
 * @desc    Get task statistics for simulation
 * @access  Public (will be protected later with auth)
 * @params  { simulationId }
 */
router.get(
  '/:simulationId/tasks/stats',
  simulationIdValidation,
  getTaskStats
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get specific task by ID
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.get(
  '/tasks/:id',
  taskIdValidation,
  getTaskById
);

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task (status, assigned robot)
 * @access  Public (will be protected later with auth)
 * @params  { id }
 * @body    { type?, description?, target_x?, target_y?, priority?, robot_id?, status? }
 */
router.put(
  '/tasks/:id',
  [...updateTaskValidation, coordinateConsistencyValidation],
  updateTask
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Remove task (only if not started)
 * @access  Public (will be protected later with auth)
 * @params  { id }
 */
router.delete(
  '/tasks/:id',
  taskIdValidation,
  deleteTask
);

/**
 * @route   POST /api/tasks/:id/assign
 * @desc    Assign task to robot
 * @access  Public (will be protected later with auth)
 * @params  { id }
 * @body    { robot_id }
 */
router.post(
  '/tasks/:id/assign',
  taskAssignmentValidation,
  assignTaskToRobot
);

export default router;