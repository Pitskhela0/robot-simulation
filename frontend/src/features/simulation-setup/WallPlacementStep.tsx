// src/features/simulation-setup/WallPlacementStep.tsx
import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { createWall, createBatchWalls, getWallsBySimulation, deleteWall } from '../../services/wallService';
import { useApi } from '../../hooks/useApi';
import Grid from '../../components/Grid/Grid';
import WallPlacementControls from './WallPlacementControls';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import './WallPlacementStep.css';

interface Wall {
  id: number;
  simulation_id: number;
  x_position: number;
  y_position: number;
  type: string;
  created_at: string;
}

const WallPlacementStep: React.FC = () => {
  const { simulationId, width, height, baseStation, robots } = useSimulation();
  const [wallMode, setWallMode] = useState(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [pendingWalls, setPendingWalls] = useState<Set<string>>(new Set());
  const [wallHistory, setWallHistory] = useState<Array<{ action: 'add' | 'remove', walls: Wall[] }>>([]);

  const {
    loading: loadingWalls,
    error: loadError,
    execute: loadWalls
  } = useApi(getWallsBySimulation);

  const {
    loading: creatingWalls,
    error: createError,
    execute: createWalls
  } = useApi(createBatchWalls);

  const {
    loading: deletingWall,
    error: deleteError,
    execute: executeDeleteWall
  } = useApi(deleteWall);

  // Load existing walls on component mount
  useEffect(() => {
    if (simulationId) {
      loadWalls(simulationId).then(wallsData => {
        setWalls(wallsData || []);
      }).catch(console.error);
    }
  }, [simulationId, loadWalls]);

  const isPositionOccupied = (x: number, y: number): boolean => {
    // Check if base station is at this position
    if (baseStation && baseStation.x === x && baseStation.y === y) {
      return true;
    }

    // Check if any robot is at this position
    if (robots.some(robot => robot.x_position === x && robot.y_position === y)) {
      return true;
    }

    // Check if wall already exists at this position
    if (walls.some(wall => wall.x_position === x && wall.y_position === y)) {
      return true;
    }

    // Check if wall is pending creation at this position
    if (pendingWalls.has(`${x},${y}`)) {
      return true;
    }

    return false;
  };

  const handleCellClick = async (x: number, y: number) => {
    if (!wallMode || !simulationId) return;

    const coordKey = `${x},${y}`;
    
    // Check if position is occupied by base station or robots
    if (baseStation && baseStation.x === x && baseStation.y === y) {
      alert('Cannot place wall at base station location');
      return;
    }

    if (robots.some(robot => robot.x_position === x && robot.y_position === y)) {
      alert('Cannot place wall where robot is located');
      return;
    }

    // Check if wall already exists - if so, remove it
    const existingWall = walls.find(wall => wall.x_position === x && wall.y_position === y);
    if (existingWall) {
      try {
        await executeDeleteWall(existingWall.id);
        const newWalls = walls.filter(wall => wall.id !== existingWall.id);
        setWalls(newWalls);
        
        // Add to history for undo
        setWallHistory(prev => [...prev, { action: 'remove', walls: [existingWall] }]);
      } catch (error) {
        console.error('Failed to delete wall:', error);
      }
      return;
    }

    // Check if wall is pending - if so, remove from pending
    if (pendingWalls.has(coordKey)) {
      setPendingWalls(prev => {
        const newSet = new Set(prev);
        newSet.delete(coordKey);
        return newSet;
      });
      return;
    }

    // Add to pending walls
    setPendingWalls(prev => new Set(prev).add(coordKey));
  };

  const handleToggleWallMode = () => {
    setWallMode(!wallMode);
    // Clear pending walls when exiting wall mode
    if (wallMode) {
      setPendingWalls(new Set());
    }
  };

  const handleSavePendingWalls = async () => {
    if (pendingWalls.size === 0 || !simulationId) return;

    const wallsToCreate = Array.from(pendingWalls).map(coordKey => {
      const [x, y] = coordKey.split(',').map(Number);
      return {
        x_position: x,
        y_position: y,
        type: 'wall'
      };
    });

    try {
      const newWalls = await createWalls(simulationId, { walls: wallsToCreate });
      setWalls(prev => [...prev, ...newWalls.walls]);
      setPendingWalls(new Set());
      
      // Add to history for undo
      setWallHistory(prev => [...prev, { action: 'add', walls: newWalls.walls }]);
    } catch (error) {
      console.error('Failed to create walls:', error);
    }
  };

  const handleClearAllWalls = async () => {
    if (walls.length === 0) return;

    if (window.confirm(`Are you sure you want to remove all ${walls.length} walls?`)) {
      try {
        // Delete all walls
        await Promise.all(walls.map(wall => executeDeleteWall(wall.id)));
        
        // Add to history for undo
        setWallHistory(prev => [...prev, { action: 'remove', walls: [...walls] }]);
        
        setWalls([]);
        setPendingWalls(new Set());
      } catch (error) {
        console.error('Failed to clear walls:', error);
      }
    }
  };

  const handleUndo = async () => {
    if (wallHistory.length === 0) return;

    const lastAction = wallHistory[wallHistory.length - 1];
    
    try {
      if (lastAction.action === 'add') {
        // Undo add: remove the walls that were added
        await Promise.all(lastAction.walls.map(wall => executeDeleteWall(wall.id)));
        setWalls(prev => prev.filter(wall => 
          !lastAction.walls.some(removedWall => removedWall.id === wall.id)
        ));
      } else {
        // Undo remove: re-add the walls that were removed
        const wallsToCreate = lastAction.walls.map(wall => ({
          x_position: wall.x_position,
          y_position: wall.y_position,
          type: wall.type
        }));
        
        if (simulationId) {
          const newWalls = await createWalls(simulationId, { walls: wallsToCreate });
          setWalls(prev => [...prev, ...newWalls.walls]);
        }
      }
      
      // Remove the last action from history
      setWallHistory(prev => prev.slice(0, -1));
    } catch (error) {
      console.error('Failed to undo action:', error);
    }
  };

  if (!simulationId) {
    return (
      <ErrorDisplay 
        error="No simulation selected. Please complete the previous steps first." 
        showRetry={false}
      />
    );
  }

  if (loadingWalls) {
    return <LoadingSpinner message="Loading walls..." />;
  }

  const totalWalls = walls.length + pendingWalls.size;
  const hasChanges = pendingWalls.size > 0;

  return (
    <div className="wall-placement-step">
      <div className="wall-placement-header">
        <h3>Place Walls & Obstacles</h3>
        <p>Click on the grid to add or remove walls. Walls will block robot movement.</p>
      </div>

      {(loadError || createError || deleteError) && (
        <ErrorDisplay 
          error={loadError || createError || deleteError || 'An error occurred'} 
          onRetry={() => simulationId && loadWalls(simulationId)}
        />
      )}

      <div className="wall-placement-content">
        <div className="wall-controls-section">
          <WallPlacementControls
            wallMode={wallMode}
            wallCount={totalWalls}
            pendingCount={pendingWalls.size}
            canUndo={wallHistory.length > 0}
            hasChanges={hasChanges}
            isLoading={creatingWalls || deletingWall}
            onToggleWallMode={handleToggleWallMode}
            onSavePending={handleSavePendingWalls}
            onClearAll={handleClearAllWalls}
            onUndo={handleUndo}
          />

          {wallMode && (
            <div className="wall-mode-instruction">
              <p className="instruction-text">
                🧱 Click on empty cells to add walls, click on existing walls to remove them
              </p>
            </div>
          )}
        </div>

        <div className="wall-grid-preview">
          <h4>Grid Preview</h4>
          <Grid
            width={width}
            height={height}
            baseStation={baseStation}
            robots={robots}
            walls={walls}
            pendingWalls={Array.from(pendingWalls).map(coordKey => {
              const [x, y] = coordKey.split(',').map(Number);
              return { x_position: x, y_position: y };
            })}
            onCellClick={handleCellClick}
            mode={wallMode ? 'wall' : 'view'}
            disabled={creatingWalls || deletingWall}
          />
        </div>
      </div>
    </div>
  );
};

export default WallPlacementStep;