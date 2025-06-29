// backend/src/controllers/simulationController.ts 
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Simulation, SimulationData } from '../models/Simulation';
import { SimulationSharing } from '../models/SimulationSharing';
import { pool } from '../db';

// Initialize models
const simulationModel = new Simulation(pool);
const simulationSharingModel = new SimulationSharing(pool);

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

// Create a new simulation (now with ownership)
export const createSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      sendResponse(res, 401, {
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const simulationData = {
      ...req.body,
      user_id: currentUserId, // Ensure simulation is owned by current user
      is_public: req.body.is_public || false // Default to private
    };

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

    // Get simulation with sharing info (even though it's new)
    const simulationWithSharing = await simulationSharingModel.getSimulationWithSharing(newSimulation.id!);

    sendResponse(res, 201, {
      success: true,
      data: simulationWithSharing,
      message: 'Simulation created successfully'
    });

  } catch (error) {
    console.error('Error creating simulation:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while creating simulation'
    });
  }
};

// Get all simulations with filtering and permissions
export const getSimulations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Extract filters
    const filters = {
      status: req.query.status as string,
      search: req.query.search as string,
      is_public: req.query.is_public === 'true',
      shared_with_me: req.query.shared_with_me === 'true',
      user_id: req.query.user_id as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string
    };

    let result;

    if (filters.shared_with_me && currentUserId) {
      // Get simulations shared with current user
      result = await simulationSharingModel.getSharedSimulations(currentUserId, { page, limit });
    } else if (filters.user_id === 'current' && currentUserId) {
      // Get current user's simulations
      result = await simulationSharingModel.getOwnedSimulations(currentUserId, { page, limit }, filters);
    } else if (filters.is_public) {
      // Get public simulations
      result = await simulationSharingModel.getPublicSimulations({ page, limit }, filters.search);
    } else if (currentUserId) {
      // Get user's own simulations by default
      result = await simulationSharingModel.getOwnedSimulations(currentUserId, { page, limit }, filters);
    } else {
      // Anonymous users can only see public simulations
      result = await simulationSharingModel.getPublicSimulations({ page, limit }, filters.search);
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

// Get simulation by ID with permission check
export const getSimulationById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const currentUserId = req.user?.id;

    // Check if user can read this simulation
    const canRead = currentUserId 
      ? await simulationSharingModel.canUserRead(id, currentUserId)
      : false;

    // Check if simulation is public (allow anonymous access)
    const simulation = await simulationModel.findById(id);
    
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    if (!canRead && !simulation.is_public) {
      sendResponse(res, 403, {
        success: false,
        message: 'You do not have permission to view this simulation'
      });
      return;
    }

    // Get simulation with full sharing information
    const simulationWithSharing = await simulationSharingModel.getSimulationWithSharing(id);

    // Add user permissions to response
    if (currentUserId) {
      const permissions = await simulationSharingModel.getUserPermissions(id, currentUserId);
      simulationWithSharing.permissions = permissions;
    } else {
      // Anonymous user permissions for public simulations
      simulationWithSharing.permissions = {
        can_read: simulation.is_public,
        can_write: false,
        can_delete: false,
        can_share: false,
        can_execute: false,
        permission_level: null,
        is_owner: false
      };
    }

    sendResponse(res, 200, {
      success: true,
      data: simulationWithSharing,
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

// Update simulation with permission check
export const updateSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const updateData = req.body;
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendResponse(res, 401, {
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if user can write to this simulation
    const canWrite = await simulationSharingModel.canUserWrite(id, currentUserId);
    if (!canWrite) {
      sendResponse(res, 403, {
        success: false,
        message: 'You do not have permission to edit this simulation'
      });
      return;
    }

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

    // Only owners can change publicity settings
    if (updateData.is_public !== undefined) {
      const isOwner = existingSimulation.user_id === currentUserId;
      if (!isOwner) {
        sendResponse(res, 403, {
          success: false,
          message: 'Only the owner can change simulation publicity settings'
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

    // Get simulation with sharing info
    const simulationWithSharing = await simulationSharingModel.getSimulationWithSharing(id);

    sendResponse(res, 200, {
      success: true,
      data: simulationWithSharing,
      message: 'Simulation updated successfully'
    });

  } catch (error) {
    console.error('Error updating simulation:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while updating simulation'
    });
  }
};

// Delete simulation with permission check
export const deleteSimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      sendResponse(res, 401, {
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if user can delete this simulation
    const canDelete = await simulationSharingModel.canUserDelete(id, currentUserId);
    if (!canDelete) {
      sendResponse(res, 403, {
        success: false,
        message: 'You do not have permission to delete this simulation'
      });
      return;
    }

    // Check if simulation exists
    const existingSimulation = await simulationModel.findById(id);
    if (!existingSimulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Delete simulation (this will cascade delete shares due to foreign key constraints)
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

    // Handle foreign key constraint violations
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

// Get simulation statistics (enhanced with permissions)
export const getSimulationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Global statistics - no authentication required
    const stats = {
      created: await simulationModel.getCountByStatus('created'),
      running: await simulationModel.getCountByStatus('running'),
      paused: await simulationModel.getCountByStatus('paused'),
      completed: await simulationModel.getCountByStatus('completed'),
      failed: await simulationModel.getCountByStatus('failed')
    };

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    // Add public simulation count
    const publicQuery = 'SELECT COUNT(*) as count FROM simulations WHERE is_public = true';
    const publicResult = await pool.query(publicQuery);
    const publicCount = parseInt(publicResult.rows[0].count);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...stats,
        total,
        public: publicCount
      },
      message: 'Global simulation statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching simulation statistics:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching statistics'
    });
  }
};