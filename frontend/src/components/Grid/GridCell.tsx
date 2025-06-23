// src/components/Grid/GridCell.tsx 
import React from 'react';
import { CellType, GridCellState } from '../../types/grid';
import { RobotVersion } from '../../types/robot';
import './GridCell.css';

interface GridCellProps {
  x: number;
  y: number;
  state: GridCellState;
  onClick: (x: number, y: number) => void;
  onMouseEnter?: (x: number, y: number) => void;
  onMouseLeave?: (x: number, y: number) => void;
}

const GridCell: React.FC<GridCellProps> = ({ 
  x, 
  y, 
  state, 
  onClick, 
  onMouseEnter, 
  onMouseLeave 
}) => {
  const getCellClassName = () => {
    const baseClass = 'grid-cell';
    const classes = [baseClass];
    
    if (state.type !== CellType.EMPTY) {
      classes.push(`cell-${state.type}`);
    }
    
    if (state.isHovered) {
      classes.push('cell-hovered');
    }
    
    if (state.isSelectable) {
      classes.push('cell-selectable');
    }
    
    if (state.robotVersion) {
      classes.push(`robot-${state.robotVersion.toLowerCase()}`);
    }
    
    return classes.join(' ');
  };

  const handleClick = () => {
    onClick(x, y);
  };

  const handleMouseEnter = () => {
    onMouseEnter?.(x, y);
  };

  const handleMouseLeave = () => {
    onMouseLeave?.(x, y);
  };

  const getCellContent = () => {
    switch (state.type) {
      case CellType.BASE_STATION:
        return <span className="cell-icon base-icon">🏠</span>;
      case CellType.ROBOT:
        return <span className="cell-icon robot-icon">🤖</span>;
      case CellType.WALL:
        return <span className="cell-icon wall-icon">⬛</span>;
      case CellType.TASK:
        return <span className="cell-icon task-icon">📋</span>;
      default:
        return null;
    }
  };

  return (
    <div 
      className={getCellClassName()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`Cell (${x}, ${y}) - ${state.type}`}
    >
      {getCellContent()}
      <span className="cell-coordinates">{x},{y}</span>
    </div>
  );
};

export default GridCell;