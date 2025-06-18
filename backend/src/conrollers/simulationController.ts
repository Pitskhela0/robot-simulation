// backend/src/controllers/simulationController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Simulation, SimulationData } from '../models/Simulation';
import { pool } from '../db';

// Initialize simulation model
const simulationModel = new Simulation(pool);

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

// Create a new simulation
export const createSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationData = req.body;

    // Validate grid dimensions
    if (!simulationModel.validateGridDimensions(simulationData.grid_width, simulationData.grid_height)) {
      sendResponse(res, 400, {
        success: false,
        message: 'Invalid grid dimensions. Width and height must be between 5 and 100'
      });
      return;
    }

    // Create simulation
    const newSimulation = await simulationModel.create(simulationData);

    sendResponse(res, 201, {
      success: true,
      data: newSimulation,
      message: 'Simulation created successfully'
    });

  } catch (error) {
    console.error('Error creating simulation:', error);
    
    // Handle database constraint violations
    if (error instanceof Error && (error as any).code === '23503') { // Foreign key violation
      sendResponse(res, 400, {
        success: false,
        message: 'Invalid user ID. User does not exist.'
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while creating simulation'
    });
  }
};

// Get all simulations with pagination
export const getSimulations = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;

    let result;
    if (userId) {
      result = await simulationModel.findByUser(userId, { page, limit });
    } else {
      result = await simulationModel.findAll({ page, limit });
    }

    sendResponse(res, 200, {
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: `Retrieved ${result.data.length} simulation(s)`
    });

  } catch (error) {
    console.error('Error fetching simulations:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching simulations'
    });
  }
};

// Get simulation by ID
export const getSimulationById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const simulation = await simulationModel.findById(id);

    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      data: simulation,
      message: 'Simulation retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching simulation:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching simulation'
    });
  }
};

// Update simulation
export const updateSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const updateData = req.body;

    // Check if simulation exists
    const existingSimulation = await simulationModel.findById(id);
    if (!existingSimulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Validate grid dimensions if provided
    if (updateData.grid_width || updateData.grid_height) {
      const newWidth = updateData.grid_width || existingSimulation.grid_width;
      const newHeight = updateData.grid_height || existingSimulation.grid_height;
      
      if (!simulationModel.validateGridDimensions(newWidth, newHeight)) {
        sendResponse(res, 400, {
          success: false,
          message: 'Invalid grid dimensions. Width and height must be between 5 and 100'
        });
        return;
      }
    }

    // Update simulation
    const updatedSimulation = await simulationModel.update(id, updateData);

    if (!updatedSimulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found or could not be updated'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      data: updatedSimulation,
      message: 'Simulation updated successfully'
    });

  } catch (error) {
    console.error('Error updating simulation:', error);

    // Handle database constraint violations
    if (error instanceof Error && (error as any).code === '23503') { // Foreign key violation
      sendResponse(res, 400, {
        success: false,
        message: 'Invalid user ID. User does not exist.'
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while updating simulation'
    });
  }
};

// Delete simulation
export const deleteSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);

    // Check if simulation exists
    const existingSimulation = await simulationModel.findById(id);
    if (!existingSimulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Delete simulation
    const deleted = await simulationModel.delete(id);

    if (!deleted) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found or could not be deleted'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Simulation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting simulation:', error);

    // Handle foreign key constraint violations (e.g., related robots exist)
    if (error instanceof Error && (error as any).code === '23503') {
      sendResponse(res, 409, {
        success: false,
        message: 'Cannot delete simulation. It has associated data that must be removed first.'
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while deleting simulation'
    });
  }
};

// Get simulation statistics (bonus endpoint)
export const getSimulationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = {
      created: await simulationModel.getCountByStatus('created'),
      running: await simulationModel.getCountByStatus('running'),
      paused: await simulationModel.getCountByStatus('paused'),
      completed: await simulationModel.getCountByStatus('completed'),
      failed: await simulationModel.getCountByStatus('failed')
    };

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...stats,
        total
      },
      message: 'Simulation statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching simulation statistics:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching statistics'
    });
  }
};