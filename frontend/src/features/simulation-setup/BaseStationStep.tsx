// src/features/simulation-setup/BaseStationStep.tsx
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import Grid from '../../components/Grid/Grid';
import Button from '../../components/UI/Button';
import './BaseStationStep.css';

const BaseStationStep: React.FC = () => {
  const { width, height, baseStation, setBaseStation } = useSimulation();
  const [placementMode, setPlacementMode] = useState(false);

  const handleCellClick = (x: number, y: number) => {
    if (placementMode) {
      setBaseStation({ x, y });
      setPlacementMode(false);
    }
  };

  const handleStartPlacement = () => {
    setPlacementMode(true);
  };

  const handleClearBaseStation = () => {
    setBaseStation(null);
    setPlacementMode(false);
  };

  return (
    <div className="base-station-step">
      <h3>Place Base Station</h3>
      <p>The base station is where robots will start and return for charging.</p>
      
      <div className="base-station-controls">
        {!baseStation ? (
          <Button onClick={handleStartPlacement} disabled={placementMode}>
            {placementMode ? 'Click on grid to place base station' : 'Place Base Station'}
          </Button>
        ) : (
          <div className="base-station-info">
            <p className="base-station-location">
              ✅ Base station placed at ({baseStation.x}, {baseStation.y})
            </p>
            <div className="base-station-actions">
              <Button onClick={handleStartPlacement}>Move Base Station</Button>
              <Button onClick={handleClearBaseStation} className="danger">
                Remove Base Station
              </Button>
            </div>
          </div>
        )}
      </div>

      {placementMode && (
        <div className="placement-instruction">
          <p className="instruction-text">
            🎯 Click on any cell in the grid to place the base station
          </p>
        </div>
      )}

      <div className="grid-preview">
        <Grid
          width={width}
          height={height}
          baseStation={baseStation}
          onCellClick={handleCellClick}
          mode={placementMode ? 'base_station' : 'view'}
        />
      </div>
    </div>
  );
};

export default BaseStationStep;