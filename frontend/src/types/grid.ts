// src/types/grid.ts (Enhanced)
import { RobotVersion } from './robot';

export enum CellType {
  EMPTY = 'empty',
  BASE_STATION = 'base_station',
  ROBOT = 'robot',
  WALL = 'wall',
  TASK = 'task'
}

export interface GridCellState {
  type: CellType;
  robotId?: number;
  robotVersion?: RobotVersion;
  robotColor?: string;
  taskId?: number;
  wallId?: number;
  isHovered?: boolean;
  isSelectable?: boolean;
  isHighlighted?: boolean;
  isDisabled?: boolean;
}

export interface BaseStation {
  x: number;
  y: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface GridBounds {
  width: number;
  height: number;
}

export interface GridInteractionState {
  mode: 'view' | 'base_station' | 'robot' | 'wall' | 'task';
  selectedCell?: GridPosition | null;
  hoveredCell?: GridPosition | null;
  disabled?: boolean;
}