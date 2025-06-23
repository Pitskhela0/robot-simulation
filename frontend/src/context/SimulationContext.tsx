// src/context/SimulationContext.tsx 
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Robot } from '../types/robot';
import { BaseStation } from '../types/grid';

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
}

const SimulationContext = createContext<ISimulationContext | undefined>(undefined);

export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [name, setName] = useState('My First Simulation');
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [baseStation, setBaseStation] = useState<BaseStation | null>(null);
  const [robots, setRobots] = useState<Robot[]>([]);

  const addRobot = (robot: Robot) => {
    setRobots(prev => [...prev, robot]);
  };

  const removeRobot = (robotId: number) => {
    setRobots(prev => prev.filter(robot => robot.id !== robotId));
  };

  const updateRobot = (robotId: number, updates: Partial<Robot>) => {
    setRobots(prev => prev.map(robot => 
      robot.id === robotId ? { ...robot, ...updates } : robot
    ));
  };

  const value = {
    simulationId,
    setSimulationId,
    name,
    setName,
    width,
    setWidth,
    height,
    setHeight,
    baseStation,
    setBaseStation,
    robots,
    setRobots,
    addRobot,
    removeRobot,
    updateRobot,
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