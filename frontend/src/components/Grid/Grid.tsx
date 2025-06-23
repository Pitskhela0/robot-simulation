// src/components/Grid/Grid.tsx (Enhanced)
import React, { useState } from 'react';
import GridCell from './GridCell';
import { CellType, GridCellState, BaseStation } from '../../types/grid';
import { Robot } from '../../types/robot';
import './Grid.css';

interface GridProps {
  width: number;
  height: number;
  baseStation?: BaseStation | null;
  robots?: Robot[];
  onCellClick: (x: number, y: number) => void;
  mode?: 'base_station' | 'robot' | 'wall' | 'task' | 'view';
}

const Grid: React.FC<GridProps> = ({ 
  width, 
  height, 
  baseStation, 
  robots = [], 
  onCellClick,
  mode = 'view'
}) => {
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number} | null>(null);

  const getCellState = (x: number, y: number): GridCellState => {
    // Check if this cell contains the base station
    if (baseStation && baseStation.x === x && baseStation.y === y) {
      return {
        type: CellType.BASE_STATION,
        isSelectable: mode === 'base_station'
      };
    }

    // Check if this cell contains a robot
    const robot = robots.find(r => r.x_position === x && r.y_position === y);
    if (robot) {
      return {
        type: CellType.ROBOT,
        robotId: robot.id,
        robotVersion: robot.version,
        isSelectable: false
      };
    }

    // Default empty cell
    return {
      type: CellType.EMPTY,
      isHovered: hoveredCell?.x === x && hoveredCell?.y === y,
      isSelectable: mode === 'base_station' || mode === 'robot'
    };
  };

  const handleCellClick = (x: number, y: number) => {
    onCellClick(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    setHoveredCell({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
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
        />
      );
    }
  }

  const gridStyle = {
    '--grid-width': width,
  } as React.CSSProperties;

  return (
    <div className={`grid-container grid-mode-${mode}`} style={gridStyle}>
      {cells}
    </div>
  );
};

export default Grid;