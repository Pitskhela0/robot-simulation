// src/features/simulation-setup/BaseStationStep.tsx
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { updateSimulation } from '../../services/simulationService'; // Add this import
import Grid from '../../components/Grid/Grid';
import Button from '../../components/UI/Button';
import './BaseStationStep.css';

const BaseStationStep: React.FC = () => {
  const { simulationId, width, height, baseStation, setBaseStation } = useSimulation(); // Add simulationId
  const [placementMode, setPlacementMode] = useState(false);

  const handleCellClick = async (x: number, y: number) => {
    if (placementMode) {
      setBaseStation({ x, y });
      
      // API call to save base station coordinates (only if simulation exists)
      if (simulationId) {
        try {
          await updateSimulation(simulationId, {
            base_station_x: x,
            base_station_y: y
          });
          console.log('Base station coordinates saved to backend');
        } catch (error) {
          console.error('Failed to save base station:', error);
          // You might want to show an error message to the user here
        }
      }
      
      setPlacementMode(false);
    }
  };

  const handleStartPlacement = () => {
    setPlacementMode(true);
  };

  const handleClearBaseStation = async () => {
    setBaseStation(null);
    setPlacementMode(false);
    
    // API call to clear base station coordinates
    if (simulationId) {
      try {
        await updateSimulation(simulationId, {
          base_station_x: null,
          base_station_y: null
        });
        console.log('Base station coordinates cleared from backend');
      } catch (error) {
        console.error('Failed to clear base station:', error);
      }
    }
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