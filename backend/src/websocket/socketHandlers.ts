// backend/src/websocket/socketHandlers.ts

import { Socket } from 'socket.io';
import { Pool } from 'pg';

// Event data interfaces
export interface SimulationJoinData {
  simulationId: number;
  userId?: number;
}

export interface SimulationUpdateData {
  simulationId: number;
  status: string;
  robots: any[];
  timestamp: string;
}

export interface RobotUpdateData {
  robotId: number;
  simulationId: number;
  x_position: number;
  y_position: number;
  battery_level: number;
  status: string;
  direction?: string;
}

export interface TaskUpdateData {
  taskId: number;
  simulationId: number;
  status: string;
  robotId?: number;
  completedAt?: string;
}

// Connection tracking
interface ClientData {
  socketId: string;
  simulationId?: number;
  userId?: number;
  connectedAt: Date;
  lastActivity: Date;
}

export class SocketHandlers {
  private pool: Pool;
  private connectedClients: Map<string, ClientData> = new Map();
  private logger: (level: string, message: string, meta?: any) => void;

  constructor(pool: Pool, logger?: (level: string, message: string, meta?: any) => void) {
    this.pool = pool;
    this.logger = logger || this.defaultLogger;
  }

  private defaultLogger(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta ? JSON.stringify(meta) : '');
  }

  // Connection event handlers
  public handleConnection = (socket: Socket): void => {
    const clientData: ClientData = {
      socketId: socket.id,
      connectedAt: new Date(),
      lastActivity: new Date()
    };

    this.connectedClients.set(socket.id, clientData);
    this.logger('info', `Client connected: ${socket.id}`, { 
      clientId: socket.id,
      totalConnections: this.connectedClients.size 
    });

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Update last activity on any event
    socket.use((packet, next) => {
      this.updateLastActivity(socket.id);
      next();
    });

    // Register event handlers
    this.registerSimulationHandlers(socket);
    this.registerUpdateHandlers(socket);
    this.registerErrorHandlers(socket);
    this.registerDisconnectionHandler(socket);
  };

  public handleDisconnection = (socket: Socket, reason: string): void => {
    const clientData = this.connectedClients.get(socket.id);
    
    if (clientData?.simulationId) {
      socket.leave(`simulation-${clientData.simulationId}`);
      this.logger('info', `Client left simulation room on disconnect`, {
        clientId: socket.id,
        simulationId: clientData.simulationId,
        reason
      });
    }

    this.connectedClients.delete(socket.id);
    this.logger('info', `Client disconnected: ${socket.id}`, { 
      reason,
      totalConnections: this.connectedClients.size 
    });

    socket.emit('disconnected', {
      reason,
      timestamp: new Date().toISOString()
    });
  };

  // Simulation room management
  private registerSimulationHandlers(socket: Socket): void {
    socket.on('simulation:join', async (data: SimulationJoinData) => {
      try {
        await this.handleSimulationJoin(socket, data);
      } catch (error) {
        this.handleError(socket, 'simulation:join', error);
      }
    });

    socket.on('simulation:leave', (data: { simulationId: number }) => {
      try {
        this.handleSimulationLeave(socket, data.simulationId);
      } catch (error) {
        this.handleError(socket, 'simulation:leave', error);
      }
    });

    socket.on('simulation:start', async (data: { simulationId: number }) => {
      try {
        await this.handleSimulationControl(socket, data.simulationId, 'running');
      } catch (error) {
        this.handleError(socket, 'simulation:start', error);
      }
    });

    socket.on('simulation:pause', async (data: { simulationId: number }) => {
      try {
        await this.handleSimulationControl(socket, data.simulationId, 'paused');
      } catch (error) {
        this.handleError(socket, 'simulation:pause', error);
      }
    });

    socket.on('simulation:reset', async (data: { simulationId: number }) => {
      try {
        await this.handleSimulationReset(socket, data.simulationId);
      } catch (error) {
        this.handleError(socket, 'simulation:reset', error);
      }
    });
  }

  private async handleSimulationJoin(socket: Socket, data: SimulationJoinData): Promise<void> {
    const { simulationId, userId } = data;

    // Validate simulation exists
    const simulation = await this.validateSimulation(simulationId);
    if (!simulation) {
      socket.emit('error', {
        event: 'simulation:join',
        message: `Simulation ${simulationId} not found`,
        code: 'SIMULATION_NOT_FOUND'
      });
      return;
    }

    // Get current client data
    const clientData = this.connectedClients.get(socket.id);
    if (!clientData) {
      socket.emit('error', {
        event: 'simulation:join',
        message: 'Client data not found',
        code: 'CLIENT_NOT_FOUND'
      });
      return;
    }

    // Leave previous room if any
    if (clientData.simulationId) {
      socket.leave(`simulation-${clientData.simulationId}`);
      this.logger('info', `Client left previous simulation room`, {
        clientId: socket.id,
        previousSimulationId: clientData.simulationId,
        newSimulationId: simulationId
      });
    }

    // Join new simulation room
    socket.join(`simulation-${simulationId}`);
    
    // Update client data
    this.connectedClients.set(socket.id, {
      ...clientData,
      simulationId,
      userId,
      lastActivity: new Date()
    });

    this.logger('info', `Client joined simulation room`, {
      clientId: socket.id,
      simulationId,
      userId
    });

    // Send current simulation state
    const currentState = await this.getSimulationState(simulationId);
    socket.emit('simulation:update', currentState);

    // Notify others in the room (optional)
    socket.to(`simulation-${simulationId}`).emit('client:joined', {
      socketId: socket.id,
      simulationId,
      timestamp: new Date().toISOString()
    });
  }

  private handleSimulationLeave(socket: Socket, simulationId: number): void {
    socket.leave(`simulation-${simulationId}`);
    
    const clientData = this.connectedClients.get(socket.id);
    if (clientData) {
      this.connectedClients.set(socket.id, {
        ...clientData,
        simulationId: undefined,
        lastActivity: new Date()
      });
    }

    this.logger('info', `Client left simulation room`, {
      clientId: socket.id,
      simulationId
    });

    // Notify others in the room (optional)
    socket.to(`simulation-${simulationId}`).emit('client:left', {
      socketId: socket.id,
      simulationId,
      timestamp: new Date().toISOString()
    });
  }

  // Update event handlers
  private registerUpdateHandlers(socket: Socket): void {
    socket.on('robot:update', (data: RobotUpdateData) => {
      try {
        this.handleRobotUpdate(socket, data);
      } catch (error) {
        this.handleError(socket, 'robot:update', error);
      }
    });

    socket.on('task:update', (data: TaskUpdateData) => {
      try {
        this.handleTaskUpdate(socket, data);
      } catch (error) {
        this.handleError(socket, 'task:update', error);
      }
    });
  }

  private handleRobotUpdate(socket: Socket, data: RobotUpdateData): void {
    // Validate client is in the simulation room
    const clientData = this.connectedClients.get(socket.id);
    if (clientData?.simulationId !== data.simulationId) {
      socket.emit('error', {
        event: 'robot:update',
        message: 'Not authorized for this simulation',
        code: 'UNAUTHORIZED_SIMULATION'
      });
      return;
    }

    // Broadcast robot position update
    socket.to(`simulation-${data.simulationId}`).emit('robot:position', {
      robotId: data.robotId,
      x_position: data.x_position,
      y_position: data.y_position,
      direction: data.direction || 'north',
      timestamp: new Date().toISOString()
    });

    // Broadcast robot status update
    socket.to(`simulation-${data.simulationId}`).emit('robot:status', {
      robotId: data.robotId,
      status: data.status,
      battery_level: data.battery_level,
      timestamp: new Date().toISOString()
    });

    this.logger('debug', `Robot update broadcasted`, {
      robotId: data.robotId,
      simulationId: data.simulationId,
      status: data.status
    });
  }

  private handleTaskUpdate(socket: Socket, data: TaskUpdateData): void {
    // Validate client is in the simulation room
    const clientData = this.connectedClients.get(socket.id);
    if (clientData?.simulationId !== data.simulationId) {
      socket.emit('error', {
        event: 'task:update',
        message: 'Not authorized for this simulation',
        code: 'UNAUTHORIZED_SIMULATION'
      });
      return;
    }

    // Broadcast appropriate task event
    if (data.robotId && data.status === 'assigned') {
      socket.to(`simulation-${data.simulationId}`).emit('task:assigned', {
        taskId: data.taskId,
        robotId: data.robotId,
        timestamp: new Date().toISOString()
      });
    } else if (data.status === 'completed' && data.robotId) {
      socket.to(`simulation-${data.simulationId}`).emit('task:completed', {
        taskId: data.taskId,
        robotId: data.robotId,
        duration: data.completedAt ? this.calculateDuration(data.completedAt) : 0,
        timestamp: new Date().toISOString()
      });
    }

    this.logger('debug', `Task update broadcasted`, {
      taskId: data.taskId,
      simulationId: data.simulationId,
      status: data.status
    });
  }

  // Simulation control handlers
  private async handleSimulationControl(socket: Socket, simulationId: number, status: string): Promise<void> {
    // Validate client is in the simulation room
    const clientData = this.connectedClients.get(socket.id);
    if (clientData?.simulationId !== simulationId) {
      socket.emit('error', {
        event: 'simulation:control',
        message: 'Not authorized for this simulation',
        code: 'UNAUTHORIZED_SIMULATION'
      });
      return;
    }

    // Update simulation status in database
    await this.updateSimulationStatus(simulationId, status);

    // Get updated simulation state
    const simulationState = await this.getSimulationState(simulationId);

    // Broadcast to all clients in the simulation room
    socket.to(`simulation-${simulationId}`).emit('simulation:update', simulationState);
    socket.emit('simulation:update', simulationState);

    this.logger('info', `Simulation control executed`, {
      simulationId,
      status,
      clientId: socket.id
    });
  }

  private async handleSimulationReset(socket: Socket, simulationId: number): Promise<void> {
    // Validate client is in the simulation room
    const clientData = this.connectedClients.get(socket.id);
    if (clientData?.simulationId !== simulationId) {
      socket.emit('error', {
        event: 'simulation:reset',
        message: 'Not authorized for this simulation',
        code: 'UNAUTHORIZED_SIMULATION'
      });
      return;
    }

    // Reset simulation in database
    await this.resetSimulation(simulationId);

    // Get updated simulation state
    const simulationState = await this.getSimulationState(simulationId);

    // Broadcast to all clients in the simulation room
    socket.to(`simulation-${simulationId}`).emit('simulation:update', simulationState);
    socket.emit('simulation:update', simulationState);

    this.logger('info', `Simulation reset executed`, {
      simulationId,
      clientId: socket.id
    });
  }

  // Error handling
  private registerErrorHandlers(socket: Socket): void {
    socket.on('error', (error: any) => {
      this.logger('error', `Socket error from client`, {
        clientId: socket.id,
        error: error.message || error
      });
    });
  }

  private registerDisconnectionHandler(socket: Socket): void {
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });
  }

  private handleError(socket: Socket, event: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    this.logger('error', `Error in ${event}`, {
      clientId: socket.id,
      event,
      error: errorMessage
    });

    socket.emit('error', {
      event,
      message: `Failed to process ${event}`,
      code: 'PROCESSING_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Utility methods
  private updateLastActivity(socketId: string): void {
    const clientData = this.connectedClients.get(socketId);
    if (clientData) {
      this.connectedClients.set(socketId, {
        ...clientData,
        lastActivity: new Date()
      });
    }
  }

  private async validateSimulation(simulationId: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT id FROM simulations WHERE id = $1',
        [simulationId]
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger('error', 'Error validating simulation', { simulationId, error });
      return false;
    }
  }

  private async getSimulationState(simulationId: number): Promise<SimulationUpdateData> {
    try {
      const simResult = await this.pool.query(
        'SELECT * FROM simulations WHERE id = $1',
        [simulationId]
      );

      const robotsResult = await this.pool.query(
        'SELECT * FROM robots WHERE simulation_id = $1',
        [simulationId]
      );

      return {
        simulationId,
        status: simResult.rows[0]?.status || 'created',
        robots: robotsResult.rows || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger('error', 'Error getting simulation state', { simulationId, error });
      throw error;
    }
  }

  private async updateSimulationStatus(simulationId: number, status: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE simulations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, simulationId]
      );
    } catch (error) {
      this.logger('error', 'Error updating simulation status', { simulationId, status, error });
      throw error;
    }
  }

  private async resetSimulation(simulationId: number): Promise<void> {
    try {
      // Reset simulation status
      await this.updateSimulationStatus(simulationId, 'created');

      // Get base station coordinates
      const baseStationResult = await this.pool.query(
        'SELECT base_station_x, base_station_y FROM simulations WHERE id = $1',
        [simulationId]
      );

      const baseX = baseStationResult.rows[0]?.base_station_x || 0;
      const baseY = baseStationResult.rows[0]?.base_station_y || 0;

      // Reset all robots
      await this.pool.query(`
        UPDATE robots 
        SET x_position = $1, 
            y_position = $2, 
            status = 'idle',
            battery_level = CASE 
              WHEN version = 'V1' THEN 100
              WHEN version = 'V2' THEN 150
              WHEN version = 'V3' THEN 200
              ELSE 100
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE simulation_id = $3
      `, [baseX, baseY, simulationId]);

      // Reset all tasks
      await this.pool.query(`
        UPDATE tasks 
        SET status = 'pending',
            robot_id = NULL,
            started_at = NULL,
            completed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE simulation_id = $1
      `, [simulationId]);

    } catch (error) {
      this.logger('error', 'Error resetting simulation', { simulationId, error });
      throw error;
    }
  }

  private calculateDuration(completedAt: string): number {
    // Simple duration calculation - you can enhance this based on your needs
    return Math.floor((new Date().getTime() - new Date(completedAt).getTime()) / 1000);
  }

  // Public utility methods
  public getConnectionStats(): { totalConnections: number; simulationRooms: Map<number, number> } {
    const simulationRooms = new Map<number, number>();
    
    this.connectedClients.forEach(client => {
      if (client.simulationId) {
        const count = simulationRooms.get(client.simulationId) || 0;
        simulationRooms.set(client.simulationId, count + 1);
      }
    });

    return {
      totalConnections: this.connectedClients.size,
      simulationRooms
    };
  }

  public getConnectedClients(): Map<string, ClientData> {
    return new Map(this.connectedClients);
  }

  public isClientInSimulation(socketId: string, simulationId: number): boolean {
    const clientData = this.connectedClients.get(socketId);
    return clientData?.simulationId === simulationId;
  }
}