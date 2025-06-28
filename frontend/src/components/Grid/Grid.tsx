// src/components/Grid/Grid.tsx (Enhanced with wall support)
import React, { useState } from 'react';
import GridCell from './GridCell';
import { CellType, GridCellState, BaseStation, Wall } from '../../types/grid';
import { Robot } from '../../types/robot';
import './Grid.css';

interface GridProps {
  width: number;
  height: number;
  baseStation?: BaseStation | null;
  robots?: Robot[];
  walls?: Wall[];
  pendingWalls?: Array<{ x_position: number; y_position: number }>;
  onCellClick: (x: number, y: number) => void;
  mode?: 'base_station' | 'robot' | 'wall' | 'task' | 'view';
  disabled?: boolean;
}

const Grid: React.FC<GridProps> = ({ 
  width, 
  height, 
  baseStation, 
  robots = [], 
  walls = [],
  pendingWalls = [],
  onCellClick,
  mode = 'view',
  disabled = false
}) => {
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);

  const getCellState = (x: number, y: number): GridCellState => {
    // Check if this cell contains the base station
    if (baseStation && baseStation.x === x && baseStation.y === y) {
      return {
        type: CellType.BASE_STATION,
        isSelectable: mode === 'base_station' && !disabled
      };
    }

    // Check if this cell contains a robot
    const robot = robots.find(r => r.x_position === x && r.y_position === y);
    if (robot) {
      return {
        type: CellType.ROBOT,
        robotId: robot.id,
        robotVersion: robot.version,
        robotColor: robot.color,
        isSelectable: false
      };
    }

    // Check if this cell contains a wall
    const wall = walls.find(w => w.x_position === x && w.y_position === y);
    if (wall) {
      return {
        type: CellType.WALL,
        wallId: wall.id,
        isSelectable: mode === 'wall' && !disabled
      };
    }

    // Check if this cell has a pending wall
    const pendingWall = pendingWalls.find(w => w.x_position === x && w.y_position === y);
    if (pendingWall) {
      return {
        type: CellType.PENDING_WALL,
        isPending: true,
        isSelectable: mode === 'wall' && !disabled
      };
    }

    // Default empty cell
    return {
      type: CellType.EMPTY,
      isHovered: hoveredCell?.x === x && hoveredCell?.y === y,
      isSelectable: (mode === 'base_station' || mode === 'robot' || mode === 'wall') && !disabled
    };
  };

  const handleCellClick = (x: number, y: number) => {
    if (!disabled) {
      onCellClick(x, y);
    }
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (!disabled) {
      setHoveredCell({ x, y });
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoveredCell(null);
    }
  };

  const cells = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellState = getCellState(x, y);
      
      cells.push(
        <GridCell
          key={`${x}-${y}`}
          x={x}
          y={y}
          state={cellState}
          onClick={handleCellClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
        />
      );
    }
  }

  const gridStyle = {
    '--grid-width': width,
  } as React.CSSProperties;

  const gridClasses = [
    'grid-container',
    `grid-mode-${mode}`,
    disabled ? 'grid-disabled' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses} style={gridStyle}>
      {cells}
    </div>
  );
};

export default Grid;