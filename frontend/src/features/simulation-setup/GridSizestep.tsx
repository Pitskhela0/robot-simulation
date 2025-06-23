// src/features/simulation-setup/GridSizeStep.tsx
import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import Input from '../../components/UI/Input';
import './GridSizeStep.css';

const GridSizeStep: React.FC = () => {
  const { name, setName, width, setWidth, height, setHeight } = useSimulation();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 5;
    setWidth(Math.max(5, Math.min(100, value)));
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 5;
    setHeight(Math.max(5, Math.min(100, value)));
  };

  return (
    <div className="grid-size-step">
      <h3>Configure Your Simulation</h3>
      
      <div className="form-group">
        <label htmlFor="simulation-name">Simulation Name:</label>
        <Input
          id="simulation-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Enter simulation name"
          maxLength={255}
        />
      </div>

      <div className="form-group">
        <label htmlFor="grid-width">Grid Width (5-100):</label>
        <Input
          id="grid-width"
          type="number"
          value={width.toString()}
          onChange={handleWidthChange}
          min="5"
          max="100"
        />
        <small>Current: {width} cells</small>
      </div>

      <div className="form-group">
        <label htmlFor="grid-height">Grid Height (5-100):</label>
        <Input
          id="grid-height"
          type="number"
          value={height.toString()}
          onChange={handleHeightChange}
          min="5"
          max="100"
        />
        <small>Current: {height} cells</small>
      </div>

      <div className="grid-info">
        <p>Grid Size: {width} × {height} = {width * height} total cells</p>
      </div>
    </div>
  );
};

export default GridSizeStep;