// backend/src/controllers/wallController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Wall, WallData, WallType } from '../models/Wall';
import { Simulation } from '../models/Simulation';
import { pool } from '../db';

// Initialize models
const wallModel = new Wall(pool);
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

// Create a new wall for a simulation
export const createWall = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const wallData = { ...req.body, simulation_id: simulationId };

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Validate wall placement
    const validation = await wallModel.validateWallPlacement(
      wallData.x_position,
      wallData.y_position,
      simulationId,
      simulation.grid_width,
      simulation.grid_height
    );

    if (!validation.valid) {
      sendResponse(res, 400, {
        success: false,
        message: validation.reason
      });
      return;
    }

    // Create wall
    const newWall = await wallModel.create(wallData);

    sendResponse(res, 201, {
      success: true,
      data: newWall,
      message: 'Wall created successfully'
    });

  } catch (error) {
    console.error('Error creating wall:', error);
    
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
      message: 'Internal server error while creating wall'
    });
  }
};

// Create multiple walls for a simulation (batch operation)
export const createBatchWalls = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const { walls } = req.body;

    if (!Array.isArray(walls) || walls.length === 0) {
      sendResponse(res, 400, {
        success: false,
        message: 'Walls array is required and must not be empty'
      });
      return;
    }

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Prepare walls data with simulation_id
    const wallsData = walls.map((wall: any) => ({
      ...wall,
      simulation_id: simulationId
    }));

    // Validate batch wall placement
    const validation = await wallModel.validateBatchWallPlacement(
      wallsData,
      simulation.grid_width,
      simulation.grid_height
    );

    if (!validation.valid) {
      sendResponse(res, 400, {
        success: false,
        message: 'Batch validation failed',
        errors: validation.errors,
        data: {
          totalRequested: walls.length,
          validWalls: validation.validWalls.length,
          errors: validation.errors.length
        }
      });
      return;
    }

    // Create all valid walls
    const createdWalls = await wallModel.createBatch(validation.validWalls);

    sendResponse(res, 201, {
      success: true,
      data: {
        walls: createdWalls,
        count: createdWalls.length
      },
      message: `Successfully created ${createdWalls.length} wall(s)`
    });

  } catch (error) {
    console.error('Error creating batch walls:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while creating walls'
    });
  }
};

// Get all walls for a simulation
export const getWallsBySimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string);

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
    if (page && limit) {
      // Return paginated results
      const paginatedResult = await wallModel.findBySimulationPaginated(simulationId, { page, limit });
      result = {
        data: paginatedResult.data,
        pagination: paginatedResult.pagination
      };
    } else {
      // Return all walls
      const walls = await wallModel.findBySimulation(simulationId);
      result = {
        data: walls,
        count: walls.length
      };
    }

    sendResponse(res, 200, {
      success: true,
      ...result,
      message: `Retrieved ${result.data.length} wall(s) for simulation ${simulationId}`
    });

  } catch (error) {
    console.error('Error fetching walls:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching walls'
    });
  }
};

// Delete wall
export const deleteWall = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);

    // Check if wall exists
    const existingWall = await wallModel.findById(id);
    if (!existingWall) {
      sendResponse(res, 404, {
        success: false,
        message: 'Wall not found'
      });
      return;
    }

    // Delete wall
    const deleted = await wallModel.delete(id);

    if (!deleted) {
      sendResponse(res, 404, {
        success: false,
        message: 'Wall not found or could not be deleted'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Wall deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting wall:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while deleting wall'
    });
  }
};

// Clear all walls for a simulation
export const clearAllWalls = async (req: Request, res: Response): Promise<void> => {
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

    // Delete all walls for the simulation
    const deletedCount = await wallModel.deleteBySimulation(simulationId);

    sendResponse(res, 200, {
      success: true,
      data: { deletedCount },
      message: `Cleared ${deletedCount} wall(s) from simulation ${simulationId}`
    });

  } catch (error) {
    console.error('Error clearing walls:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while clearing walls'
    });
  }
};

// Check if coordinates are valid and available
export const checkCoordinates = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const x = parseInt(req.query.x as string);
    const y = parseInt(req.query.y as string);

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Check coordinate validity and occupancy
    const isValid = wallModel.isValidCoordinate(x, y, simulation.grid_width, simulation.grid_height);
    const occupancy = await wallModel.isCellOccupiedByAny(x, y, simulationId);

    sendResponse(res, 200, {
      success: true,
      data: {
        coordinates: { x, y },
        isValid,
        isAvailable: isValid && !occupancy.hasWall && !occupancy.hasRobot,
        occupancy: {
          hasWall: occupancy.hasWall,
          hasRobot: occupancy.hasRobot,
          robotId: occupancy.robotId
        }
      },
      message: 'Coordinate check completed'
    });

  } catch (error) {
    console.error('Error checking path:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while checking path'
    });
  }
};

// Get grid representation
export const getGridRepresentation = async (req: Request, res: Response): Promise<void> => {
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

    // Get grid representation
    const grid = await wallModel.getGridRepresentation(
      simulationId,
      simulation.grid_width,
      simulation.grid_height
    );

    sendResponse(res, 200, {
      success: true,
      data: {
        grid,
        dimensions: {
          width: simulation.grid_width,
          height: simulation.grid_height
        },
        legend: {
          0: 'empty',
          1: 'wall'
        }
      },
      message: 'Grid representation generated'
    });

  } catch (error) {
    console.error('Error generating grid representation:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while generating grid'
    });
  }
};

export const checkPath = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const fromX = parseInt(req.query.fromX as string);
    const fromY = parseInt(req.query.fromY as string);
    const toX = parseInt(req.query.toX as string);
    const toY = parseInt(req.query.toY as string);

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Validate coordinates
    const fromValid = wallModel.isValidCoordinate(fromX, fromY, simulation.grid_width, simulation.grid_height);
    const toValid = wallModel.isValidCoordinate(toX, toY, simulation.grid_width, simulation.grid_height);

    if (!fromValid || !toValid) {
      sendResponse(res, 400, {
        success: false,
        message: 'Invalid coordinates provided'
      });
      return;
    }

    // Check if path is blocked
    const isBlocked = await wallModel.isPathBlocked(fromX, fromY, toX, toY, simulationId);
    const distance = wallModel.getManhattanDistance(fromX, fromY, toX, toY);
    const euclideanDistance = wallModel.getEuclideanDistance(fromX, fromY, toX, toY);

    sendResponse(res, 200, {
      success: true,
      data: {
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
        isBlocked,
        isPathClear: !isBlocked,
        distances: {
          manhattan: distance,
          euclidean: Math.round(euclideanDistance * 100) / 100 // Round to 2 decimal places
        }
      },
      message: 'Path check completed'
    });

  } catch (error) {
    console.error('Error checking path:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'An unexpected error occurred while checking the path'});
  }
};
