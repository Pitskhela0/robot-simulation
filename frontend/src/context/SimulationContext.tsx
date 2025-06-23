// src/ context/ SimulationContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';


interface ISimulationContext {
  simulationId: number | null;
  setSimulationId: (id: number | null) => void;
  name: string;
  setName: (name: string) => void;
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
}

const SimulationContext = createContext<ISimulationContext | undefined>(undefined);


export const SimulationProvider = ({ children }: { children: ReactNode }) => {
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [name, setName] = useState('My First Simulation');
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);

  const value = {
    simulationId,
    setSimulationId,
    name,
    setName,
    width,
    setWidth,
    height,
    setHeight,
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