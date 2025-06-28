// frontend/src/context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Robot } from '../types/robot';

// Event interfaces matching backend
interface RobotPositionData {
  robotId: number;
  x_position: number;
  y_position: number;
  direction: string;
  timestamp: string;
}

interface RobotStatusData {
  robotId: number;
  status: string;
  battery_level: number;
  timestamp: string;
}

interface TaskAssignmentData {
  taskId: number;
  robotId: number;
  timestamp: string;
}

interface TaskCompletionData {
  taskId: number;
  robotId: number;
  duration: number;
  timestamp: string;
}

interface BatteryAlertData {
  robotId: number;
  battery_level: number;
  timestamp: string;
}

interface SimulationUpdateData {
  simulationId: number;
  status: string;
  robots: Robot[];
  timestamp: string;
}

// Connection states
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Context interface
interface SocketContextType {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  currentSimulationId: number | null;
  
  // Connection methods
  connect: () => void;
  disconnect: () => void;
  
  // Simulation methods
  joinSimulation: (simulationId: number) => void;
  leaveSimulation: (simulationId: number) => void;
  startSimulation: (simulationId: number) => void;
  pauseSimulation: (simulationId: number) => void;
  resetSimulation: (simulationId: number) => void;
  
  // Event listeners
  onRobotPositionUpdate: (callback: (data: RobotPositionData) => void) => () => void;
  onRobotStatusUpdate: (callback: (data: RobotStatusData) => void) => () => void;
  onTaskAssigned: (callback: (data: TaskAssignmentData) => void) => () => void;
  onTaskCompleted: (callback: (data: TaskCompletionData) => void) => () => void;
  onBatteryAlert: (callback: (data: BatteryAlertData) => void) => () => void;
  onSimulationUpdate: (callback: (data: SimulationUpdateData) => void) => () => void;
  onError: (callback: (message: string) => void) => () => void;
  
  // Utility methods
  isConnected: () => boolean;
  getConnectionInfo: () => { status: ConnectionStatus; simulationId: number | null };
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Custom hook for using socket context
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Provider component
interface SocketProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ 
  children, 
  serverUrl = process.env.REACT_APP_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [currentSimulationId, setCurrentSimulationId] = useState<number | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  const connect = useCallback(() => {
    if (socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log(`🔌 Connecting to WebSocket server at ${serverUrl}`);
    setConnectionStatus(ConnectionStatus.CONNECTING);

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      setConnectionStatus(ConnectionStatus.CONNECTED);
      setReconnectAttempts(0);
    });

    newSocket.on('connected', () => {
      console.log('📡 Server confirmed connection');
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`🔌 WebSocket disconnected: ${reason}`);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      setCurrentSimulationId(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      setConnectionStatus(ConnectionStatus.ERROR);
      setReconnectAttempts(prev => prev + 1);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
      setConnectionStatus(ConnectionStatus.CONNECTED);
      setReconnectAttempts(0);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ WebSocket reconnection error:', error);
      setReconnectAttempts(prev => prev + 1);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed - max attempts reached');
      setConnectionStatus(ConnectionStatus.ERROR);
    });

    // Error handling
    newSocket.on('error', (message: string) => {
      console.error('🚨 WebSocket error:', message);
    });

    setSocket(newSocket);
  }, [serverUrl, socket?.connected]);

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (socket) {
      console.log('🔌 Manually disconnecting WebSocket');
      socket.disconnect();
      setSocket(null);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      setCurrentSimulationId(null);
    }
  }, [socket]);

  // Simulation control methods
  const joinSimulation = useCallback((simulationId: number) => {
    if (!socket?.connected) {
      console.error('Cannot join simulation: WebSocket not connected');
      return;
    }

    console.log(`📥 Joining simulation ${simulationId}`);
    socket.emit('simulation:join', simulationId);
    setCurrentSimulationId(simulationId);
  }, [socket]);

  const leaveSimulation = useCallback((simulationId: number) => {
    if (!socket?.connected) {
      console.error('Cannot leave simulation: WebSocket not connected');
      return;
    }

    console.log(`📤 Leaving simulation ${simulationId}`);
    socket.emit('simulation:leave', simulationId);
    setCurrentSimulationId(null);
  }, [socket]);

  const startSimulation = useCallback((simulationId: number) => {
    if (!socket?.connected) {
      console.error('Cannot start simulation: WebSocket not connected');
      return;
    }

    console.log(`▶️ Starting simulation ${simulationId}`);
    socket.emit('simulation:start', simulationId);
  }, [socket]);

  const pauseSimulation = useCallback((simulationId: number) => {
    if (!socket?.connected) {
      console.error('Cannot pause simulation: WebSocket not connected');
      return;
    }

    console.log(`⏸️ Pausing simulation ${simulationId}`);
    socket.emit('simulation:pause', simulationId);
  }, [socket]);

  const resetSimulation = useCallback((simulationId: number) => {
    if (!socket?.connected) {
      console.error('Cannot reset simulation: WebSocket not connected');
      return;
    }

    console.log(`🔄 Resetting simulation ${simulationId}`);
    socket.emit('simulation:reset', simulationId);
  }, [socket]);

  // Event listener helpers that return cleanup functions
  const onRobotPositionUpdate = useCallback((callback: (data: RobotPositionData) => void) => {
    if (!socket) return () => {};
    
    socket.on('robot:position', callback);
    return () => socket.off('robot:position', callback);
  }, [socket]);

  const onRobotStatusUpdate = useCallback((callback: (data: RobotStatusData) => void) => {
    if (!socket) return () => {};
    
    socket.on('robot:status', callback);
    return () => socket.off('robot:status', callback);
  }, [socket]);

  const onTaskAssigned = useCallback((callback: (data: TaskAssignmentData) => void) => {
    if (!socket) return () => {};
    
    socket.on('task:assigned', callback);
    return () => socket.off('task:assigned', callback);
  }, [socket]);

  const onTaskCompleted = useCallback((callback: (data: TaskCompletionData) => void) => {
    if (!socket) return () => {};
    
    socket.on('task:completed', callback);
    return () => socket.off('task:completed', callback);
  }, [socket]);

  const onBatteryAlert = useCallback((callback: (data: BatteryAlertData) => void) => {
    if (!socket) return () => {};
    
    socket.on('battery:low', callback);
    return () => socket.off('battery:low', callback);
  }, [socket]);

  const onSimulationUpdate = useCallback((callback: (data: SimulationUpdateData) => void) => {
    if (!socket) return () => {};
    
    socket.on('simulation:update', callback);
    return () => socket.off('simulation:update', callback);
  }, [socket]);

  const onError = useCallback((callback: (message: string) => void) => {
    if (!socket) return () => {};
    
    socket.on('error', callback);
    return () => socket.off('error', callback);
  }, [socket]);

  // Utility methods
  const isConnected = useCallback(() => {
    return socket?.connected || false;
  }, [socket]);

  const getConnectionInfo = useCallback(() => {
    return {
      status: connectionStatus,
      simulationId: currentSimulationId
    };
  }, [connectionStatus, currentSimulationId]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Cleanup socket listeners on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.removeAllListeners();
      }
    };
  }, [socket]);

  const contextValue: SocketContextType = {
    socket,
    connectionStatus,
    currentSimulationId,
    connect,
    disconnect,
    joinSimulation,
    leaveSimulation,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    onRobotPositionUpdate,
    onRobotStatusUpdate,
    onTaskAssigned,
    onTaskCompleted,
    onBatteryAlert,
    onSimulationUpdate,
    onError,
    isConnected,
    getConnectionInfo
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};