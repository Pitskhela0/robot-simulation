// backend/src/engine/types.ts

export enum SimulationState {
  STOPPED = 'STOPPED',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED'
}

export interface SimulationConfig {
  updateInterval: number; // milliseconds
  maxRobots: number;
  enableLogging: boolean;
  batteryDrainEnabled: boolean;
  taskAllocationEnabled: boolean;
}

export interface RobotState {
  id: number;
  x_position: number;
  y_position: number;
  direction: string;
  battery_level: number;
  status: string; // 'idle', 'moving', 'working', 'charging'
  current_task_id?: number | null;
  target_x?: number;
  target_y?: number;
  path?: Array<{ x: number; y: number }>;
  last_updated: Date;
}

export interface TaskState {
  id: number;
  robot_id?: number | null;
  type: string;
  target_x: number;
  target_y: number;
  priority: number;
  status: string; // 'pending', 'assigned', 'in_progress', 'completed', 'failed'
  assigned_at?: Date;
  started_at?: Date;
  completed_at?: Date;
}

export interface SimulationSnapshot {
  id: number;
  state: SimulationState;
  robots: Map<number, RobotState>;
  tasks: Map<number, TaskState>;
  elapsed_time: number;
  last_update: Date;
  statistics: {
    tasks_completed: number;
    total_distance_traveled: number;
    robot_utilization: number;
  };
}

export interface EngineEventData {
  simulation_id: number;
  event_type: 'robot_moved' | 'task_assigned' | 'task_completed' | 'battery_low' | 'simulation_state_changed';
  timestamp: Date;
  data: any;
}

export type EngineEventHandler = (event: EngineEventData) => void;