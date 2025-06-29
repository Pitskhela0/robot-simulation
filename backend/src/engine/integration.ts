// backend/src/engine/integration.ts
// This file shows how to integrate the engine with your existing Express server

import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { EngineManager, EngineEventData } from './index';

export class EngineIntegration {
  private engineManager: EngineManager;
  private io: SocketIOServer | null = null;

  constructor(pool: Pool) {
    this.engineManager = new EngineManager(pool);
    this.setupEngineEvents();
  }

  // Set Socket.IO server for real-time updates
  public setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  // Setup event forwarding to WebSocket clients
  private setupEngineEvents(): void {
    this.engineManager.addEventListener((event: EngineEventData) => {
      this.handleEngineEvent(event);
    });
  }

  private handleEngineEvent(event: EngineEventData): void {
    if (!this.io) return;

    // Broadcast to simulation room
    const roomName = `simulation-${event.simulation_id}`;
    
    switch (event.event_type) {
      case 'robot_moved':
        this.io.to(roomName).emit('robot:position', {
          robotId: event.data.robotId,
          x_position: event.data.robotState.x_position,
          y_position: event.data.robotState.y_position,
          direction: event.data.robotState.direction,
          timestamp: event.timestamp.toISOString()
        });

        this.io.to(roomName).emit('robot:status', {
          robotId: event.data.robotId,
          status: event.data.robotState.status,
          battery_level: event.data.robotState.battery_level,
          timestamp: event.timestamp.toISOString()
        });
        break;

      case 'task_assigned':
        this.io.to(roomName).emit('task:assigned', {
          taskId: event.data.taskId,
          robotId: event.data.taskState.robot_id,
          timestamp: event.timestamp.toISOString()
        });
        break;

      case 'task_completed':
        this.io.to(roomName).emit('task:completed', {
          taskId: event.data.taskId,
          robotId: event.data.robotId,
          duration: Math.round(event.data.duration / 1000),
          timestamp: event.timestamp.toISOString()
        });
        break;

      case 'battery_low':
        this.io.to(roomName).emit('battery:low', {
          robotId: event.data.robotId,
          battery_level: event.data.batteryLevel,
          timestamp: event.timestamp.toISOString()
        });
        break;

      case 'simulation_state_changed':
        this.io.to(roomName).emit('simulation:update', {
          simulationId: event.simulation_id,
          status: event.data.newState,
          timestamp: event.timestamp.toISOString(),
          ...event.data
        });
        break;
    }
  }

  // API methods for simulation control
  public async startSimulation(simulationId: number): Promise<void> {
    const engine = await this.engineManager.createEngine(simulationId);
    await this.engineManager.startEngine(simulationId);
  }

  public async pauseSimulation(simulationId: number): Promise<void> {
    await this.engineManager.pauseEngine(simulationId);
  }

  public async resumeSimulation(simulationId: number): Promise<void> {
    await this.engineManager.resumeEngine(simulationId);
  }

  public async resetSimulation(simulationId: number): Promise<void> {
    await this.engineManager.resetEngine(simulationId);
  }

  public async stopSimulation(simulationId: number): Promise<void> {
    await this.engineManager.stopEngine(simulationId);
  }

  public getSimulationSnapshot(simulationId: number) {
    const engine = this.engineManager.getEngine(simulationId);
    return engine ? engine.getSnapshot() : null;
  }

  public getManagerStatistics() {
    return this.engineManager.getManagerStatistics();
  }

  public getEngineStatuses() {
    return this.engineManager.getEngineStatuses();
  }

  // Cleanup
  public async shutdown(): Promise<void> {
    await this.engineManager.shutdown();
  }
}
