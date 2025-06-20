// backend/src/controllers/robotController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Robot, RobotData, RobotVersion, RobotStatus } from '../models/Robot';
import { Simulation } from '../models/Simulation';
import { pool } from '../db';

// Initialize models
const robotModel = new Robot(pool);
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

// Create a new robot for a simulation
export const createRobot = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const robotData = { ...req.body, simulation_id: simulationId };

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    // Validate robot position within grid bounds
    if (!robotModel.validatePosition(robotData.x_position, robotData.y_position, simulation.grid_width, simulation.grid_height)) {
      sendResponse(res, 400, {
        success: false,
        message: `Robot position must be within grid bounds (0,0) to (${simulation.grid_width-1},${simulation.grid_height-1})`
      });
      return;
    }

    // Validate battery level for robot version
    if (robotData.battery_level !== undefined && !robotModel.validateBatteryLevel(robotData.battery_level, robotData.version)) {
      const maxCapacity = robotModel.getMaxBatteryCapacity(robotData.version);
      sendResponse(res, 400, {
        success: false,
        message: `Battery level must be between 0 and ${maxCapacity} for ${robotData.version}`
      });
      return;
    }

    // Set default battery level to max capacity if not provided
    if (robotData.battery_level === undefined) {
      robotData.battery_level = robotModel.getMaxBatteryCapacity(robotData.version);
    }

    // Set default status if not provided
    if (robotData.status === undefined) {
      robotData.status = RobotStatus.IDLE;
    }

    // Create robot
    const newRobot = await robotModel.create(robotData);

    // Add capabilities info to response
    const capabilities = robotModel.getCapabilities(newRobot.version);

    sendResponse(res, 201, {
      success: true,
      data: {
        ...newRobot,
        capabilities
      },
      message: 'Robot created successfully'
    });

  } catch (error) {
    console.error('Error creating robot:', error);
    
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
      message: 'Internal server error while creating robot'
    });
  }
};

// Get all robots for a simulation
export const getRobotsBySimulation = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const simulationId = parseInt(req.params.simulationId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Verify simulation exists
    const simulation = await simulationModel.findById(simulationId);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Simulation not found'
      });
      return;
    }

    const result = await robotModel.findBySimulation(simulationId, { page, limit });

    // Add capabilities info to each robot
    const robotsWithCapabilities = result.data.map(robot => ({
      ...robot,
      capabilities: robotModel.getCapabilities(robot.version)
    }));

    sendResponse(res, 200, {
      success: true,
      data: robotsWithCapabilities,
      pagination: result.pagination,
      message: `Retrieved ${result.data.length} robot(s) for simulation ${simulationId}`
    });

  } catch (error) {
    console.error('Error fetching robots:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching robots'
    });
  }
};

// Get robot by ID
export const getRobotById = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const robot = await robotModel.findById(id);

    if (!robot) {
      sendResponse(res, 404, {
        success: false,
        message: 'Robot not found'
      });
      return;
    }

    // Add capabilities info
    const capabilities = robotModel.getCapabilities(robot.version);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...robot,
        capabilities
      },
      message: 'Robot retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching robot:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching robot'
    });
  }
};

// Update robot
export const updateRobot = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);
    const updateData = req.body;

    // Check if robot exists
    const existingRobot = await robotModel.findById(id);
    if (!existingRobot) {
      sendResponse(res, 404, {
        success: false,
        message: 'Robot not found'
      });
      return;
    }

    // Get simulation for validation
    const simulation = await simulationModel.findById(existingRobot.simulation_id);
    if (!simulation) {
      sendResponse(res, 404, {
        success: false,
        message: 'Associated simulation not found'
      });
      return;
    }

    // Validate position if provided
    if (updateData.x_position !== undefined || updateData.y_position !== undefined) {
      const newX = updateData.x_position !== undefined ? updateData.x_position : existingRobot.x_position;
      const newY = updateData.y_position !== undefined ? updateData.y_position : existingRobot.y_position;
      
      if (!robotModel.validatePosition(newX, newY, simulation.grid_width, simulation.grid_height)) {
        sendResponse(res, 400, {
          success: false,
          message: `Robot position must be within grid bounds (0,0) to (${simulation.grid_width-1},${simulation.grid_height-1})`
        });
        return;
      }
    }

    // Validate battery level if provided
    if (updateData.battery_level !== undefined) {
      const version = updateData.version || existingRobot.version;
      if (!robotModel.validateBatteryLevel(updateData.battery_level, version)) {
        const maxCapacity = robotModel.getMaxBatteryCapacity(version);
        sendResponse(res, 400, {
          success: false,
          message: `Battery level must be between 0 and ${maxCapacity} for ${version}`
        });
        return;
      }
    }

    // Update robot
    const updatedRobot = await robotModel.update(id, updateData);

    if (!updatedRobot) {
      sendResponse(res, 404, {
        success: false,
        message: 'Robot not found or could not be updated'
      });
      return;
    }

    // Add capabilities info
    const capabilities = robotModel.getCapabilities(updatedRobot.version);

    sendResponse(res, 200, {
      success: true,
      data: {
        ...updatedRobot,
        capabilities
      },
      message: 'Robot updated successfully'
    });

  } catch (error) {
    console.error('Error updating robot:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while updating robot'
    });
  }
};

// Delete robot
export const deleteRobot = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    if (handleValidationErrors(req, res)) return;

    const id = parseInt(req.params.id);

    // Check if robot exists
    const existingRobot = await robotModel.findById(id);
    if (!existingRobot) {
      sendResponse(res, 404, {
        success: false,
        message: 'Robot not found'
      });
      return;
    }

    // Delete robot
    const deleted = await robotModel.delete(id);

    if (!deleted) {
      sendResponse(res, 404, {
        success: false,
        message: 'Robot not found or could not be deleted'
      });
      return;
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Robot deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting robot:', error);

    // Handle foreign key constraint violations (e.g., related tasks exist)
    if (error instanceof Error && (error as any).code === '23503') {
      sendResponse(res, 409, {
        success: false,
        message: 'Cannot delete robot. It has associated data that must be removed first.'
      });
      return;
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while deleting robot'
    });
  }
};

// Get robot capabilities (bonus endpoint)
export const getRobotCapabilities = async (req: Request, res: Response): Promise<void> => {
  try {
    const version = req.params.version as RobotVersion;

    if (!Object.values(RobotVersion).includes(version)) {
      sendResponse(res, 400, {
        success: false,
        message: 'Invalid robot version'
      });
      return;
    }

    const capabilities = robotModel.getCapabilities(version);

    sendResponse(res, 200, {
      success: true,
      data: {
        version,
        capabilities
      },
      message: 'Robot capabilities retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching robot capabilities:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Internal server error while fetching capabilities'
    });
  }
};