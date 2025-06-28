// src/components/Grid/GridCell.tsx (Updated with task support)
import React, { memo } from 'react';
import { CellType, GridCellState } from '../../types/grid';
import './GridCell.css';

interface GridCellProps {
  x: number;
  y: number;
  state: GridCellState;
  onClick: (x: number, y: number) => void;
  onMouseEnter?: (x: number, y: number) => void;
  onMouseLeave?: () => void;
  showCoordinates?: boolean;
  disabled?: boolean;
}

const GridCell: React.FC<GridCellProps> = memo(({ 
  x, 
  y, 
  state, 
  onClick, 
  onMouseEnter, 
  onMouseLeave,
  showCoordinates = true,
  disabled = false
}) => {
  const getCellClassName = () => {
    const baseClass = 'grid-cell';
    const classes = [baseClass];
    
    // Add type-specific class
    classes.push(`cell-${state.type}`);
    
    // Add state classes
    if (state.isHovered && !disabled) {
      classes.push('cell-hovered');
    }
    
    if (state.isSelectable && !disabled) {
      classes.push('cell-selectable');
    }

    if (state.isHighlighted) {
      classes.push('cell-highlighted');
    }
    
    if (state.robotVersion) {
      classes.push(`robot-${state.robotVersion.toLowerCase()}`);
    }

    if (state.isPending) {
      classes.push('cell-pending');
    }

    if (disabled) {
      classes.push('cell-disabled');
    }
    
    // Add priority-based classes for tasks
    if (state.type === CellType.TASK && state.taskPriority) {
      if (state.taskPriority >= 8) {
        classes.push('task-high-priority');
      } else if (state.taskPriority >= 5) {
        classes.push('task-medium-priority');
      } else {
        classes.push('task-low-priority');
      }
    }
    
    return classes.join(' ');
  };

  const handleClick = () => {
    if (!disabled) {
      onClick(x, y);
    }
  };

  const handleMouseEnter = () => {
    if (!disabled) {
      onMouseEnter?.(x, y);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      onMouseLeave?.();
    }
  };

  const getCellContent = () => {
    switch (state.type) {
      case CellType.BASE_STATION:
        return <span className="cell-icon base-icon" title="Base Station">🏠</span>;
      case CellType.ROBOT:
        return (
          <span 
            className="cell-icon robot-icon" 
            style={{ color: state.robotColor }}
            title={`Robot (${state.robotVersion})`}
          >
            🤖
          </span>
        );
      case CellType.WALL:
        return <span className="cell-icon wall-icon" title="Wall">⬛</span>;
      case CellType.PENDING_WALL:
        return <span className="cell-icon pending-wall-icon" title="Pending Wall">⬜</span>;
      case CellType.TASK:
        return (
          <span 
            className="cell-icon task-icon" 
            style={{ color: state.taskColor }}
            title={`Task (Priority: ${state.taskPriority})`}
          >
            {state.taskIcon}
          </span>
        );
      default:
        return null;
    }
  };

  const getCellStyle = () => {
    const style: React.CSSProperties = {};
    
    if (state.type === CellType.ROBOT && state.robotColor) {
      style.borderColor = state.robotColor;
    }
    
    if (state.type === CellType.TASK && state.taskColor) {
      style.borderColor = state.taskColor;
    }
    
    return style;
  };

  const getCellTitle = () => {
    let title = `Cell (${x}, ${y}) - ${state.type.replace('_', ' ')}`;
    
    if (state.type === CellType.TASK) {
      title += ` (Priority: ${state.taskPriority})`;
    }
    
    if (disabled) {
      title += ' (Disabled)';
    } else if (state.isSelectable) {
      title += ' (Click to interact)';
    }
    
    return title;
  };

  return (
    <div 
      className={getCellClassName()}
      style={getCellStyle()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={getCellTitle()}
      role="button"
      tabIndex={state.isSelectable && !disabled ? 0 : -1}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {getCellContent()}
      {showCoordinates && (
        <span className="cell-coordinates">{x},{y}</span>
      )}
    </div>
  );
});

GridCell.displayName = 'GridCell';

export default GridCell;