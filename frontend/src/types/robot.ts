// src/types/robot.ts
export enum RobotVersion {
  V1 = 'V1',
  V2 = 'V2',
  V3 = 'V3'
}

export enum RobotStatus {
  IDLE = 'idle',
  MOVING = 'moving',
  WORKING = 'working',
  CHARGING = 'charging'
}

export interface RobotCapabilities {
  taskSpeedMultiplier: number;
  batteryCapacity: number;
  chargeSpeedMultiplier: number;
}

export const ROBOT_CAPABILITIES: Record<RobotVersion, RobotCapabilities> = {
  [RobotVersion.V1]: {
    taskSpeedMultiplier: 1.0,
    batteryCapacity: 100,
    chargeSpeedMultiplier: 1.0
  },
  [RobotVersion.V2]: {
    taskSpeedMultiplier: 1.5,
    batteryCapacity: 150,
    chargeSpeedMultiplier: 1.3
  },
  [RobotVersion.V3]: {
    taskSpeedMultiplier: 2.0,
    batteryCapacity: 200,
    chargeSpeedMultiplier: 1.5
  }
};

export const ROBOT_VERSION_DISPLAY_NAMES: Record<RobotVersion, string> = {
  [RobotVersion.V1]: 'Standard Robot (V1)',
  [RobotVersion.V2]: 'Advanced Robot (V2)',
  [RobotVersion.V3]: 'Elite Robot (V3)'
};

export interface Robot {
  id: number;
  simulation_id: number;
  name: string;
  version: RobotVersion;
  x_position: number;
  y_position: number;
  direction: string;
  battery_level: number;
  status: RobotStatus;
  color: string;
  created_at: string;
  updated_at: string;
  capabilities?: RobotCapabilities;
}

export interface CreateRobotPayload {
  name: string;
  version: RobotVersion;
  x_position: number;
  y_position: number;
  battery_level?: number;
  status?: RobotStatus;
  direction?: string;
  color?: string;
}