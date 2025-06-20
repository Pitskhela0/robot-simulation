// backend/src/controllers/taskController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Task, TaskData, TaskType, TaskStatus } from '../models/Task';
import { Simulation } from '../models/Simulation';
import { Robot } from '../models/Robot';
import { pool } from '../db';

// Initialize models
const taskModel = new Task(pool);
const simulationModel = new Simulation(pool);
const robotModel = new Robot(pool);

// Response formatting utilities
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  pagination?: any;
}

const sendResponse = <T>(res: Response, statusCode: number, response: ApiResponse<T>) => {
  res.status(statusCode).json(response);
};

const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendResponse(res, 400, {
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return true;
  }
  return false;
};

// Create a new task for a simulation
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const taskData = { ...req.body, simulation_id: simulationId };

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Validate task coordinates within grid bounds
    if (!taskModel.validateCoordinates(taskData.target_x, taskData.target_y, simulation.grid_width, simulation.grid_height)) {
      sendResponse(res, 400, {
        success: false,
        message: `Task coordinates must be within grid bounds (0,0) to (${simulation.grid_width-1},${simulation.grid_height-1})`
      });
      return;
    }

    // Validate priority if provided
    if (taskData.priority !== undefined && !taskModel.validatePriority(taskData.priority)) {
      sendResponse(res, 400, {
        success: false,
        message: 'Task priority must be between 1 and 10'
      });
      return;
    }

    // Create task
    const newTask = await taskModel.create(taskData);

    // Add task type specs to response
    const taskSpecs = taskModel.getTaskTypeSpecs(newTask.type);

    sendResponse(res, 201, {
      success: true,
      data: {
        ...newTask,
        taskSpecs
      },
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('Error creating task:', error);
    
    // Handle database constraint violations
    if (error instanceof Error && (error as any).code === '23503') { // Foreign key violation
      sendResponse(res, 400, {
        success: false,
        message: 'Invalid simulation ID. Simulation does not exist.'
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while creating task'
    });
  }
};

// Get all tasks for a simulation
export const getTasksBySimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as TaskStatus;

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    let result;
    if (status) {
      // Filter by status
      const tasks = await taskModel.findByStatus(simulationId, status);
      result = {
        data: tasks.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: tasks.length,
          totalPages: Math.ceil(tasks.length / limit),
          hasNext: page * limit < tasks.length,
          hasPrev: page > 1
        }
      };
    } else {
      result = await taskModel.findBySimulation(simulationId, { page, limit });
    }

    // Add task specs to each task
    const tasksWithSpecs = result.data.map(task => ({
      ...task,
      taskSpecs: taskModel.getTaskTypeSpecs(task.type)
    }));

    sendResponse(res, 200, {
      success: true,
      data: tasksWithSpecs,
      pagination: result.pagination,
      message: `Retrieved ${result.data.length} task(s) for simulation ${simulationId}`
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching tasks'
    });
  }
};

// Get task by ID
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const task = await taskModel.findById(id);

    if (!task) {
      sendResponse(res, 404, {
        success: false,
        message: 'Task not found'
      });
      return;
    }

    // Add task specs
    const taskSpecs = taskModel.getTaskTypeSpecs(task.type);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...task,
        taskSpecs
      },
      message: 'Task retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching task:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching task'
    });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const updateData = req.body;

    // Check if task exists
    const existingTask = await taskModel.findById(id);
    if (!existingTask) {
      sendResponse(res, 404, {
        success: false,
        message: 'Task not found'
      });
      return;
    }

    // Get simulation for validation
    const simulation = await simulationModel.findById(existingTask.simulation_id);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Associated simulation not found'
      });
      return;
    }

    // Validate coordinates if provided
    if (updateData.target_x !== undefined || updateData.target_y !== undefined) {
      const newX = updateData.target_x !== undefined ? updateData.target_x : existingTask.target_x;
      const newY = updateData.target_y !== undefined ? updateData.target_y : existingTask.target_y;
      
      if (!taskModel.validateCoordinates(newX, newY, simulation.grid_width, simulation.grid_height)) {
        sendResponse(res, 400, {
          success: false,
          message: `Task coordinates must be within grid bounds (0,0) to (${simulation.grid_width-1},${simulation.grid_height-1})`
        });
        return;
      }
    }

    // Validate priority if provided
    if (updateData.priority !== undefined && !taskModel.validatePriority(updateData.priority)) {
      sendResponse(res, 400, {
        success: false,
        message: 'Task priority must be between 1 and 10'
      });
      return;
    }

    // Validate robot assignment if provided
    if (updateData.robot_id !== undefined && updateData.robot_id !== null) {
      const robot = await robotModel.findById(updateData.robot_id);
      if (!robot) {
        sendResponse(res, 400, {
          success: false,
          message: 'Invalid robot ID. Robot does not exist.'
        });
        return;
      }

      if (robot.simulation_id !== existingTask.simulation_id) {
        sendResponse(res, 400, {
          success: false,
          message: 'Robot must belong to the same simulation as the task'
        });
        return;
      }
    }

    // Update task
    const updatedTask = await taskModel.update(id, updateData);

    if (!updatedTask) {
      sendResponse(res, 404, {
        success: false,
        message: 'Task not found or could not be updated'
      });
      return;
    }

    // Add task specs
    const taskSpecs = taskModel.getTaskTypeSpecs(updatedTask.type);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...updatedTask,
        taskSpecs
      },
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while updating task'
    });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);

    // Check if task exists
    const existingTask = await taskModel.findById(id);
    if (!existingTask) {
      sendResponse(res, 404, {
        success: false,
        message: 'Task not found'
      });
      return;
    }

    // Delete task
    const deleted = await taskModel.delete(id);

    if (!deleted) {
      sendResponse(res, 404, {
        success: false,
        message: 'Task not found or could not be deleted'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);

    // Handle deletion restriction errors
    if (error instanceof Error && error.message.includes('Cannot delete task')) {
      sendResponse(res, 409, {
        success: false,
        message: error.message
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while deleting task'
    });
  }
};

// Assign task to robot
export const assignTaskToRobot = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const taskId = parseInt(req.params.id);
    const { robot_id } = req.body;

    // Validate robot exists
    const robot = await robotModel.findById(robot_id);
    if (!robot) {
      sendResponse(res, 400, {
        success: false,
        message: 'Robot not found'
      });
      return;
    }

    // Assign task
    const updatedTask = await taskModel.assignToRobot(taskId, robot_id);

    if (!updatedTask) {
      sendResponse(res, 400, {
        success: false,
        message: 'Task cannot be assigned or does not exist'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      data: updatedTask,
      message: 'Task assigned to robot successfully'
    });

  } catch (error) {
    console.error('Error assigning task to robot:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while assigning task'
    });
  }
};

// Get task statistics
export const getTaskStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    const stats = await taskModel.getCompletionStats(simulationId);

    // Get counts by type
    const typeStats = {
      pickup: await taskModel.getCountByType(simulationId, TaskType.PICKUP),
      putdown: await taskModel.getCountByType(simulationId, TaskType.PUTDOWN),
      cleaning: await taskModel.getCountByType(simulationId, TaskType.CLEANING),
      inspection: await taskModel.getCountByType(simulationId, TaskType.INSPECTION)
    };

    sendResponse(res, 200, {
      success: true,
      data: {
        ...stats,
        byType: typeStats
      },
      message: 'Task statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching task statistics:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching statistics'
    });
  }
};