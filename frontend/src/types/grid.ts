// src/types/grid.ts
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
  isHovered?: boolean;
  isSelectable?: boolean;
}

export interface BaseStation {
  x: number;
  y: number;
}