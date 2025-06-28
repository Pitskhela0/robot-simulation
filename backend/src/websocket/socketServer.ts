// backend/src/websocket/socketServer.ts

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Pool } from 'pg';

// Event interfaces for type safety
export interface SimulationEvents {
  'simulation:join': (simulationId: number) => void;
  'simulation:leave': (simulationId: number) => void;
  'simulation:start': (simulationId: number) => void;
  'simulation:pause': (simulationId: number) => void;
  'simulation:reset': (simulationId: number) => void;
  'robot:update': (data: RobotUpdateData) => void;
  'task:update': (data: TaskUpdateData) => void;
  'battery:update': (data: BatteryUpdateData) => void;
}

export interface ClientEvents {
  'simulation:update': (data: SimulationUpdateData) => void;
  'robot:position': (data: RobotPositionData) => void;
  'robot:status': (data: RobotStatusData) => void;
  'task:assigned': (data: TaskAssignmentData) => void;
  'task:completed': (data: TaskCompletionData) => void;
  'battery:low': (data: BatteryAlertData) => void;
  'error': (message: string) => void;
  'connected': () => void;
  'disconnected': () => void;
}

// Data interfaces
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

export interface BatteryUpdateData {
  robotId: number;
  simulationId: number;
  battery_level: number;
  isCharging: boolean;
}

export interface SimulationUpdateData {
  simulationId: number;
  status: string;
  robots: RobotUpdateData[];
  timestamp: string;
}

export interface RobotPositionData {
  robotId: number;
  x_position: number;
  y_position: number;
  direction: string;
  timestamp: string;
}

export interface RobotStatusData {
  robotId: number;
  status: string;
  battery_level: number;
  timestamp: string;
}

export interface TaskAssignmentData {
  taskId: number;
  robotId: number;
  timestamp: string;
}

export interface TaskCompletionData {
  taskId: number;
  robotId: number;
  duration: number;
  timestamp: string;
}

export interface BatteryAlertData {
  robotId: number;
  battery_level: number;
  timestamp: string;
}

export class SocketServer {
  private io: SocketIOServer;
  private pool: Pool;
  private connectedClients: Map<string, { socketId: string; simulationId?: number }> = new Map();
  
  constructor(httpServer: HttpServer, pool: Pool) {
    this.pool = pool;
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    console.log('✅ Socket.IO server initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, { socketId: socket.id });

      // Send connection confirmation
      socket.emit('connected');

      // Handle simulation room management
      socket.on('simulation:join', async (simulationId: number) => {
        try {
          // Validate simulation exists
          const simulation = await this.validateSimulation(simulationId);
          if (!simulation) {
            socket.emit('error', `Simulation ${simulationId} not found`);
            return;
          }

          // Leave previous room if any
          const clientData = this.connectedClients.get(socket.id);
          if (clientData?.simulationId) {
            socket.leave(`simulation-${clientData.simulationId}`);
            console.log(`📤 Socket ${socket.id} left simulation ${clientData.simulationId}`);
          }

          // Join new simulation room
          socket.join(`simulation-${simulationId}`);
          this.connectedClients.set(socket.id, { 
            socketId: socket.id, 
            simulationId 
          });

          console.log(`📥 Socket ${socket.id} joined simulation ${simulationId}`);

          // Send current simulation state
          const currentState = await this.getSimulationState(simulationId);
          socket.emit('simulation:update', currentState);

        } catch (error) {
          console.error('Error joining simulation:', error);
          socket.emit('error', 'Failed to join simulation');
        }
      });

      socket.on('simulation:leave', (simulationId: number) => {
        socket.leave(`simulation-${simulationId}`);
        this.connectedClients.set(socket.id, { socketId: socket.id });
        console.log(`📤 Socket ${socket.id} left simulation ${simulationId}`);
      });

      // Handle simulation control events
      socket.on('simulation:start', async (simulationId: number) => {
        try {
          await this.updateSimulationStatus(simulationId, 'running');
          this.broadcastToSimulation(simulationId, 'simulation:update', {
            simulationId,
            status: 'running',
            robots: await this.getSimulationRobots(simulationId),
            timestamp: new Date().toISOString()
          });
          console.log(`▶️ Simulation ${simulationId} started`);
        } catch (error) {
          console.error('Error starting simulation:', error);
          socket.emit('error', 'Failed to start simulation');
        }
      });

      socket.on('simulation:pause', async (simulationId: number) => {
        try {
          await this.updateSimulationStatus(simulationId, 'paused');
          this.broadcastToSimulation(simulationId, 'simulation:update', {
            simulationId,
            status: 'paused',
            robots: await this.getSimulationRobots(simulationId),
            timestamp: new Date().toISOString()
          });
          console.log(`⏸️ Simulation ${simulationId} paused`);
        } catch (error) {
          console.error('Error pausing simulation:', error);
          socket.emit('error', 'Failed to pause simulation');
        }
      });

      socket.on('simulation:reset', async (simulationId: number) => {
        try {
          await this.resetSimulation(simulationId);
          this.broadcastToSimulation(simulationId, 'simulation:update', {
            simulationId,
            status: 'created',
            robots: await this.getSimulationRobots(simulationId),
            timestamp: new Date().toISOString()
          });
          console.log(`🔄 Simulation ${simulationId} reset`);
        } catch (error) {
          console.error('Error resetting simulation:', error);
          socket.emit('error', 'Failed to reset simulation');
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
        socket.emit('disconnected');
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Public methods for broadcasting updates from simulation engine
  public broadcastRobotUpdate(data: RobotUpdateData): void {
    this.broadcastToSimulation(data.simulationId, 'robot:position', {
      robotId: data.robotId,
      x_position: data.x_position,
      y_position: data.y_position,
      direction: data.direction || 'north',
      timestamp: new Date().toISOString()
    });

    this.broadcastToSimulation(data.simulationId, 'robot:status', {
      robotId: data.robotId,
      status: data.status,
      battery_level: data.battery_level,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastTaskUpdate(data: TaskUpdateData): void {
    if (data.robotId && data.status === 'assigned') {
      this.broadcastToSimulation(data.simulationId, 'task:assigned', {
        taskId: data.taskId,
        robotId: data.robotId,
        timestamp: new Date().toISOString()
      });
    }

    if (data.status === 'completed' && data.robotId) {
      this.broadcastToSimulation(data.simulationId, 'task:completed', {
        taskId: data.taskId,
        robotId: data.robotId,
        duration: 0, // Calculate actual duration
        timestamp: new Date().toISOString()
      });
    }
  }

  public broadcastBatteryAlert(data: BatteryUpdateData): void {
    if (data.battery_level <= 20 && !data.isCharging) {
      this.broadcastToSimulation(data.simulationId, 'battery:low', {
        robotId: data.robotId,
        battery_level: data.battery_level,
        timestamp: new Date().toISOString()
      });
    }
  }

  public broadcastSimulationUpdate(data: SimulationUpdateData): void {
    this.broadcastToSimulation(data.simulationId, 'simulation:update', data);
  }

  // Private helper methods
  private broadcastToSimulation(simulationId: number, event: string, data: any): void {
    this.io.to(`simulation-${simulationId}`).emit(event, data);
  }

  private async validateSimulation(simulationId: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT id FROM simulations WHERE id = $1',
        [simulationId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error validating simulation:', error);
      return false;
    }
  }

  private async getSimulationState(simulationId: number): Promise<SimulationUpdateData> {
    try {
      const simResult = await this.pool.query(
        'SELECT * FROM simulations WHERE id = $1',
        [simulationId]
      );

      const robots = await this.getSimulationRobots(simulationId);

      return {
        simulationId,
        status: simResult.rows[0]?.status || 'created',
        robots,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting simulation state:', error);
      throw error;
    }
  }

  private async getSimulationRobots(simulationId: number): Promise<RobotUpdateData[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM robots WHERE simulation_id = $1',
        [simulationId]
      );

      return result.rows.map(robot => ({
        robotId: robot.id,
        simulationId: robot.simulation_id,
        x_position: robot.x_position,
        y_position: robot.y_position,
        battery_level: robot.battery_level,
        status: robot.status,
        direction: robot.direction
      }));
    } catch (error) {
      console.error('Error getting simulation robots:', error);
      return [];
    }
  }

  private async updateSimulationStatus(simulationId: number, status: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE simulations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, simulationId]
      );
    } catch (error) {
      console.error('Error updating simulation status:', error);
      throw error;
    }
  }

  private async resetSimulation(simulationId: number): Promise<void> {
    try {
      // Reset simulation status
      await this.updateSimulationStatus(simulationId, 'created');

      // Reset all robot positions to base station and full battery
      const baseStationResult = await this.pool.query(
        'SELECT base_station_x, base_station_y FROM simulations WHERE id = $1',
        [simulationId]
      );

      const baseX = baseStationResult.rows[0]?.base_station_x || 0;
      const baseY = baseStationResult.rows[0]?.base_station_y || 0;

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

      // Reset all tasks to pending
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
      console.error('Error resetting simulation:', error);
      throw error;
    }
  }

  // Getter for the Socket.IO instance (for use in other parts of the application)
  public getIO(): SocketIOServer {
    return this.io;
  }

  // Get connection statistics
  public getConnectionStats(): { totalConnections: number; simulationRooms: number } {
    const rooms = this.io.sockets.adapter.rooms;
    const simulationRooms = Array.from(rooms.keys()).filter(room => 
      room.startsWith('simulation-')
    ).length;

    return {
      totalConnections: this.connectedClients.size,
      simulationRooms
    };
  }
}

export default SocketServer;