// src/context/SimulationContext.tsx - Updated with authentication
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Robot } from '../types/robot';
import { BaseStation } from '../types/grid';
import { createSimulation, updateSimulation } from '../services/simulationService';

interface ISimulationContext {
  simulationId: number | null;
  setSimulationId: (id: number | null) => void;
  name: string;
  setName: (name: string) => void;
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
  baseStation: BaseStation | null;
  setBaseStation: (baseStation: BaseStation | null) => void;
  robots: Robot[];
  setRobots: (robots: Robot[]) => void;
  addRobot: (robot: Robot) => void;
  removeRobot: (robotId: number) => void;
  updateRobot: (robotId: number, updates: Partial<Robot>) => void;
  isOwner: boolean;
  canEdit: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  createNewSimulation: () => Promise<number | null>;
  saveSimulation: () => Promise<boolean>;
}

const SimulationContext = createContext<ISimulationContext | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [name, setName] = useState('My Robot Simulation');
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [baseStation, setBaseStation] = useState<BaseStation | null>(null);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if current user owns this simulation
  const isOwner = simulationId ? true : false; // Simplified for now
  const canEdit = isAuthenticated && isOwner;

  // Auto-save functionality
  useEffect(() => {
    if (simulationId && canEdit) {
      const autoSave = setTimeout(() => {
        saveSimulation();
      }, 30000); // Auto-save every 30 seconds

      return () => clearTimeout(autoSave);
    }
  }, [simulationId, name, width, height, baseStation, canEdit]);

  const createNewSimulation = async (): Promise<number | null> => {
    if (!isAuthenticated) {
      setError('You must be signed in to create simulations');
      return null;
    }

    try {
      const newSimulation = await createSimulation({
        name,
        grid_width: width,
        grid_height: height,
        description: `Grid simulation: ${width}x${height}`,
      });
      
      setSimulationId(newSimulation.id);
      setError(null);
      return newSimulation.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create simulation';
      setError(errorMessage);
      return null;
    }
  };

  const saveSimulation = async (): Promise<boolean> => {
    if (!simulationId || !canEdit) {
      return false;
    }

    try {
      await updateSimulation(simulationId, {
        name,
        grid_width: width,
        grid_height: height,
        base_station_x: baseStation?.x || null,
        base_station_y: baseStation?.y || null,
      });
      
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save simulation';
      setError(errorMessage);
      return false;
    }
  };

  const addRobot = (robot: Robot) => {
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    setRobots(prev => [...prev, robot]);
  };

  const removeRobot = (robotId: number) => {
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    setRobots(prev => prev.filter(robot => robot.id !== robotId));
  };

  const updateRobot = (robotId: number, updates: Partial<Robot>) => {
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    setRobots(prev => prev.map(robot => 
      robot.id === robotId ? { ...robot, ...updates } : robot
    ));
  };

  // Validation for grid changes
  const setWidthValidated = (newWidth: number) => {
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    
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
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    
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

  const setNameValidated = (newName: string) => {
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    
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

  const setBaseStationValidated = (newBaseStation: BaseStation | null) => {
    if (!canEdit) {
      setError('You do not have permission to modify this simulation');
      return;
    }
    
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

  const value = {
    simulationId,
    setSimulationId,
    name,
    setName: setNameValidated,
    width,
    setWidth: setWidthValidated,
    height,
    setHeight: setHeightValidated,
    baseStation,
    setBaseStation: setBaseStationValidated,
    robots,
    setRobots,
    addRobot,
    removeRobot,
    updateRobot,
    isOwner,
    canEdit,
    error,
    setError,
    createNewSimulation,
    saveSimulation,
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

// Protected wrapper component
export const ProtectedSimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="simulation-loading">
        <LoadingSpinner message="Loading simulation..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="simulation-auth-required">
        <div className="auth-message">
          <h3>Authentication Required</h3>
          <p>Please sign in to create and manage simulations.</p>
          <Button onClick={() => window.location.href = '/login'}>
            Sign In
          </Button>
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