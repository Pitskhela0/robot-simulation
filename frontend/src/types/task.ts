// src/types/task.ts
export enum TaskType {
  PICKUP = 'pickup',
  PUTDOWN = 'putdown',
  CLEANING = 'cleaning',
  INSPECTION = 'inspection'
}

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Task {
  id: number;
  simulation_id: number;
  robot_id?: number | null;
  type: TaskType;
  description?: string;
  target_x: number;
  target_y: number;
  priority: number;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface CreateTaskPayload {
  type: TaskType;
  description?: string;
  target_x: number;
  target_y: number;
  priority?: number;
  robot_id?: number | null;
  status?: TaskStatus;
}

export interface TaskTypeSpecs {
  baseTimeSeconds: number;
  description: string;
  icon: string;
  color: string;
}

export const TASK_TYPE_SPECS: Record<TaskType, TaskTypeSpecs> = {
  [TaskType.PICKUP]: {
    baseTimeSeconds: 2.0,
    description: 'Pick up an object from the specified location',
    icon: '📦',
    color: '#007bff'
  },
  [TaskType.PUTDOWN]: {
    baseTimeSeconds: 1.5,
    description: 'Put down an object at the specified location',
    icon: '📋',
    color: '#28a745'
  },
  [TaskType.CLEANING]: {
    baseTimeSeconds: 4.0,
    description: 'Clean the specified area',
    icon: '🧹',
    color: '#ffc107'
  },
  [TaskType.INSPECTION]: {
    baseTimeSeconds: 3.0,
    description: 'Inspect the specified location for issues',
    icon: '🔍',
    color: '#6f42c1'
  }
};

export const TASK_TYPE_DISPLAY_NAMES: Record<TaskType, string> = {
  [TaskType.PICKUP]: 'Pick Up',
  [TaskType.PUTDOWN]: 'Put Down',
  [TaskType.CLEANING]: 'Cleaning',
  [TaskType.INSPECTION]: 'Inspection'
};

export const TASK_STATUS_DISPLAY_NAMES: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Pending',
  [TaskStatus.ASSIGNED]: 'Assigned',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.COMPLETED]: 'Completed',
  [TaskStatus.FAILED]: 'Failed'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '#6c757d',
  [TaskStatus.ASSIGNED]: '#007bff',
  [TaskStatus.IN_PROGRESS]: '#ffc107',
  [TaskStatus.COMPLETED]: '#28a745',
  [TaskStatus.FAILED]: '#dc3545'
};