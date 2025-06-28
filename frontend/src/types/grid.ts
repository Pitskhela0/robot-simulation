// src/types/grid.ts (Updated to include tasks)
import { RobotVersion } from './robot';
import { TaskType } from './task';

export enum CellType {
  EMPTY = 'empty',
  BASE_STATION = 'base_station',
  ROBOT = 'robot',
  WALL = 'wall',
  TASK = 'task',
  PENDING_WALL = 'pending_wall'
}

export interface GridCellState {
  type: CellType;
  robotId?: number;
  robotVersion?: RobotVersion;
  robotColor?: string;
  taskId?: number;
  taskType?: TaskType;
  taskIcon?: string;
  taskColor?: string;
  taskPriority?: number;
  wallId?: number;
  isHovered?: boolean;
  isSelectable?: boolean;
  isHighlighted?: boolean;
  isDisabled?: boolean;
  isPending?: boolean;
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

export interface Wall {
  id?: number;
  simulation_id?: number;
  x_position: number;
  y_position: number;
  type?: string;
  created_at?: string;
}