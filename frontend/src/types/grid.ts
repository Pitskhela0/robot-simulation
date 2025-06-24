// src/types/grid.ts (FIXED)
import { RobotVersion } from './robot'; // Add this import

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
  robotVersion?: RobotVersion; // Now this will work
  isHovered?: boolean;
  isSelectable?: boolean;
}

export interface BaseStation {
  x: number;
  y: number;
}