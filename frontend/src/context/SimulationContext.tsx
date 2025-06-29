// src/context/SimulationContext.tsx 
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Robot } from '../types/robot';
import { BaseStation } from '../types/grid';
import { 
  Simulation, 
  SimulationPermissions, 
  PermissionLevel, 
  SimulationAccessLevel,
  ShareSimulationPayload 
} from '../types/simulation';
import { 
  createSimulation, 
  updateSimulation, 
  getSimulationById,
  shareSimulation,
  updateUserPermission,
  removeUserAccess,
  duplicateSimulation 
} from '../services/simulationService';

interface ISimulationContext {
  // Current simulation state
  simulation: Simulation | null;
  simulationId: number | null;
  
  // Basic properties
  name: string;
  setName: (name: string) => void;
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
  baseStation: BaseStation | null;
  setBaseStation: (baseStation: BaseStation | null) => void;
  
  // Entities
  robots: Robot[];
  setRobots: (robots: Robot[]) => void;
  addRobot: (robot: Robot) => void;
  removeRobot: (robotId: number) => void;
  updateRobot: (robotId: number, updates: Partial<Robot>) => void;
  
  // Ownership and permissions
  accessLevel: SimulationAccessLevel;
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
    canExecute: boolean;
  };
  
  // State management
  isLoading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Operations
  createNewSimulation: () => Promise<number | null>;
  loadSimulation: (id: number) => Promise<boolean>;
  saveSimulation: () => Promise<boolean>;
  shareSimulationWithUser: (payload: ShareSimulationPayload) => Promise<boolean>;
  updateUserPermissions: (userId: number, level: PermissionLevel) => Promise<boolean>;
  removeUserFromSimulation: (userId: number) => Promise<boolean>;
  duplicateCurrentSimulation: (newName?: string) => Promise<number | null>;
  makePublic: () => Promise<boolean>;
  makePrivate: () => Promise<boolean>;
  
  // Validation helpers
  validateEdit: (operation: string) => boolean;
  getPermissionMessage: (operation: string) => string;
}

const SimulationContext = createContext<ISimulationContext | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Core state
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [name, setName] = useState('My Robot Simulation');
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [baseStation, setBaseStation] = useState<BaseStation | null>(null);
  const [robots, setRobots] = useState<Robot[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate permissions based on current simulation and user
  const accessLevel = simulation && user 
    ? SimulationPermissions.getAccessLevel(simulation, user.id)
    : SimulationAccessLevel.NO_ACCESS;

  const permissions = {
    canRead: simulation ? SimulationPermissions.canRead(simulation, user?.id) : false,
    canWrite: simulation ? SimulationPermissions.canWrite(simulation, user?.id) : false,
    canDelete: simulation ? SimulationPermissions.canDelete(simulation, user?.id) : false,
    canShare: simulation ? SimulationPermissions.canShare(simulation, user?.id) : false,
    canExecute: simulation ? SimulationPermissions.canExecute(simulation, user?.id) : false,
  };

  // Auto-save functionality for owners and editors
  useEffect(() => {
    if (simulationId && permissions.canWrite && simulation) {
      const autoSave = setTimeout(() => {
        saveSimulation();
      }, 30000); // Auto-save every 30 seconds

      return () => clearTimeout(autoSave);
    }
  }, [simulationId, name, width, height, baseStation, permissions.canWrite]);

  // Load simulation when ID changes
  useEffect(() => {
    if (simulationId && simulationId !== simulation?.id) {
      loadSimulation(simulationId);
    }
  }, [simulationId]);

  const createNewSimulation = async (): Promise<number | null> => {
    if (!isAuthenticated) {
      setError('You must be signed in to create simulations');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newSimulation = await createSimulation({
        name,
        grid_width: width,
        grid_height: height,
        description: `Grid simulation: ${width}x${height}`,
        is_public: false,
      });
      
      setSimulation(newSimulation);
      setSimulationId(newSimulation.id);
      return newSimulation.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create simulation';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadSimulation = async (id: number): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedSimulation = await getSimulationById(id);
      
      setSimulation(loadedSimulation);
      setSimulationId(loadedSimulation.id);
      setName(loadedSimulation.name);
      setWidth(loadedSimulation.grid_width);
      setHeight(loadedSimulation.grid_height);
      
      if (loadedSimulation.base_station_x !== null && loadedSimulation.base_station_y !== null) {
        setBaseStation({
          x: loadedSimulation.base_station_x,
          y: loadedSimulation.base_station_y
        });
      } else {
        setBaseStation(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load simulation';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const saveSimulation = async (): Promise<boolean> => {
    if (!simulationId || !permissions.canWrite) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await updateSimulation(simulationId, {
        name,
        grid_width: width,
        grid_height: height,
        base_station_x: baseStation?.x || null,
        base_station_y: baseStation?.y || null,
      });
      
      setSimulation(updatedSimulation);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save simulation';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const shareSimulationWithUser = async (payload: ShareSimulationPayload): Promise<boolean> => {
    if (!simulationId || !permissions.canShare) {
      setError('You do not have permission to share this simulation');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await shareSimulation(simulationId, payload);
      setSimulation(updatedSimulation);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share simulation';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserPermissions = async (userId: number, level: PermissionLevel): Promise<boolean> => {
    if (!simulationId || !permissions.canShare) {
      setError('You do not have permission to modify permissions');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await updateUserPermission(simulationId, { user_id: userId, permission_level: level });
      setSimulation(updatedSimulation);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update permissions';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeUserFromSimulation = async (userId: number): Promise<boolean> => {
    if (!simulationId || !permissions.canShare) {
      setError('You do not have permission to remove users');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await removeUserAccess(simulationId, userId);
      setSimulation(updatedSimulation);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove user access';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateCurrentSimulation = async (newName?: string): Promise<number | null> => {
    if (!simulationId || !permissions.canRead) {
      setError('You do not have permission to duplicate this simulation');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const duplicatedSimulation = await duplicateSimulation(simulationId, newName);
      return duplicatedSimulation.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate simulation';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const makePublic = async (): Promise<boolean> => {
    if (!simulationId || !permissions.canWrite) {
      setError('You do not have permission to make this simulation public');
      return false;
    }

    return saveSimulation();
  };

  const makePrivate = async (): Promise<boolean> => {
    if (!simulationId || !permissions.canWrite) {
      setError('You do not have permission to make this simulation private');
      return false;
    }

    return saveSimulation();
  };

  // Validation helpers
  const validateEdit = (operation: string): boolean => {
    if (!isAuthenticated) {
      setError('You must be signed in to perform this action');
      return false;
    }

    if (!permissions.canWrite) {
      setError(getPermissionMessage(operation));
      return false;
    }

    return true;
  };

  const getPermissionMessage = (operation: string): string => {
    if (!isAuthenticated) {
      return 'You must be signed in to perform this action';
    }

    switch (accessLevel) {
      case SimulationAccessLevel.NO_ACCESS:
        return 'You do not have access to this simulation';
      case SimulationAccessLevel.PUBLIC_READ:
        return 'This is a read-only public simulation. You cannot modify it';
      case SimulationAccessLevel.SHARED_READ:
        return 'You have read-only access to this simulation. Contact the owner for edit permissions';
      case SimulationAccessLevel.SHARED_WRITE:
      case SimulationAccessLevel.SHARED_ADMIN:
      case SimulationAccessLevel.OWNER:
        return `You can ${operation}`;
      default:
        return `You do not have permission to ${operation}`;
    }
  };

  // Enhanced setters with validation
  const setNameValidated = (newName: string) => {
    if (!validateEdit('edit the simulation name')) return;
    
    if (!newName.trim()) {
      setError('Simulation name cannot be empty');
      return;
    }
    
    if (newName.length > 255) {
      setError('Simulation name must be less than 255 characters');
      return;
    }
    
    setName(newName);
    setError(null);
  };

  const setWidthValidated = (newWidth: number) => {
    if (!validateEdit('modify the grid width')) return;
    
    if (newWidth < 5 || newWidth > 100) {
      setError('Width must be between 5 and 100');
      return;
    }
    
    // Check if base station or robots are outside new bounds
    if (baseStation && baseStation.x >= newWidth) {
      setError(`Cannot reduce width below ${baseStation.x + 1} - base station would be outside grid`);
      return;
    }
    
    const robotsOutside = robots.filter(robot => robot.x_position >= newWidth);
    if (robotsOutside.length > 0) {
      setError(`Cannot reduce width - ${robotsOutside.length} robot(s) would be outside grid`);
      return;
    }
    
    setWidth(newWidth);
    setError(null);
  };

  const setHeightValidated = (newHeight: number) => {
    if (!validateEdit('modify the grid height')) return;
    
    if (newHeight < 5 || newHeight > 100) {
      setError('Height must be between 5 and 100');
      return;
    }
    
    // Check if base station or robots are outside new bounds
    if (baseStation && baseStation.y >= newHeight) {
      setError(`Cannot reduce height below ${baseStation.y + 1} - base station would be outside grid`);
      return;
    }
    
    const robotsOutside = robots.filter(robot => robot.y_position >= newHeight);
    if (robotsOutside.length > 0) {
      setError(`Cannot reduce height - ${robotsOutside.length} robot(s) would be outside grid`);
      return;
    }
    
    setHeight(newHeight);
    setError(null);
  };

  const setBaseStationValidated = (newBaseStation: BaseStation | null) => {
    if (!validateEdit('modify the base station')) return;
    
    if (newBaseStation) {
      // Check if position is within grid bounds
      if (newBaseStation.x >= width || newBaseStation.y >= height) {
        setError('Base station position is outside grid bounds');
        return;
      }
      
      // Check if position conflicts with existing robots
      const robotAtPosition = robots.find(
        robot => robot.x_position === newBaseStation.x && robot.y_position === newBaseStation.y
      );
      
      if (robotAtPosition) {
        setError(`Cannot place base station - robot "${robotAtPosition.name}" is at that position`);
        return;
      }
    }
    
    setBaseStation(newBaseStation);
    setError(null);
  };

  // Enhanced robot management with permission checks
  const addRobot = (robot: Robot) => {
    if (!validateEdit('add robots')) return;
    setRobots(prev => [...prev, robot]);
  };

  const removeRobot = (robotId: number) => {
    if (!validateEdit('remove robots')) return;
    setRobots(prev => prev.filter(robot => robot.id !== robotId));
  };

  const updateRobot = (robotId: number, updates: Partial<Robot>) => {
    if (!validateEdit('update robots')) return;
    setRobots(prev => prev.map(robot => 
      robot.id === robotId ? { ...robot, ...updates } : robot
    ));
  };

  const value: ISimulationContext = {
    // Current simulation state
    simulation,
    simulationId,
    
    // Basic properties
    name,
    setName: setNameValidated,
    width,
    setWidth: setWidthValidated,
    height,
    setHeight: setHeightValidated,
    baseStation,
    setBaseStation: setBaseStationValidated,
    
    // Entities
    robots,
    setRobots,
    addRobot,
    removeRobot,
    updateRobot,
    
    // Ownership and permissions
    accessLevel,
    permissions,
    
    // State management
    isLoading,
    error,
    setError,
    
    // Operations
    createNewSimulation,
    loadSimulation,
    saveSimulation,
    shareSimulationWithUser,
    updateUserPermissions,
    removeUserFromSimulation,
    duplicateCurrentSimulation,
    makePublic,
    makePrivate,
    
    // Validation helpers
    validateEdit,
    getPermissionMessage,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

// Enhanced protected wrapper with better error handling
export const ProtectedSimulationProvider: React.FC<{ 
  children: ReactNode;
  requireAuth?: boolean;
  fallback?: ReactNode;
}> = ({ 
  children, 
  requireAuth = true,
  fallback 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="simulation-loading">
        <LoadingSpinner message="Loading simulation..." />
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="simulation-auth-required">
        <div className="auth-message">
          <h3>Authentication Required</h3>
          <p>Please sign in to create and manage simulations.</p>
          <div className="auth-actions">
            <Button onClick={() => window.location.href = '/login'}>
              Sign In
            </Button>
            <Button 
              onClick={() => window.location.href = '/simulations/public'}
              className="secondary"
            >
              Browse Public Simulations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SimulationProvider>
      {children}
    </SimulationProvider>
  );
};