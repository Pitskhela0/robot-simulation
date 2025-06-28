// frontend/src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Robot } from '../types/robot';

// Custom hook for robot real-time updates
export const useRobotUpdates = (simulationId: number | null) => {
  const { onRobotPositionUpdate, onRobotStatusUpdate, isConnected } = useSocket();
  const [robotPositions, setRobotPositions] = useState<Map<number, { x: number; y: number; direction: string }>>(new Map());
  const [robotStatuses, setRobotStatuses] = useState<Map<number, { status: string; battery: number }>>(new Map());

  useEffect(() => {
    if (!simulationId || !isConnected()) return;

    // Subscribe to robot position updates
    const unsubscribePosition = onRobotPositionUpdate((data) => {
      setRobotPositions(prev => new Map(prev).set(data.robotId, {
        x: data.x_position,
        y: data.y_position,
        direction: data.direction
      }));
    });

    // Subscribe to robot status updates
    const unsubscribeStatus = onRobotStatusUpdate((data) => {
      setRobotStatuses(prev => new Map(prev).set(data.robotId, {
        status: data.status,
        battery: data.battery_level
      }));
    });

    return () => {
      unsubscribePosition();
      unsubscribeStatus();
    };
  }, [simulationId, isConnected, onRobotPositionUpdate, onRobotStatusUpdate]);

  return {
    robotPositions,
    robotStatuses,
    isConnected: isConnected()
  };
};

// Custom hook for simulation control
export const useSimulationControl = () => {
  const { 
    startSimulation, 
    pauseSimulation, 
    resetSimulation, 
    joinSimulation, 
    leaveSimulation,
    onSimulationUpdate,
    isConnected 
  } = useSocket();
  
  const [simulationStatus, setSimulationStatus] = useState<string>('created');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isConnected()) return;

    const unsubscribe = onSimulationUpdate((data) => {
      setSimulationStatus(data.status);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [isConnected, onSimulationUpdate]);

  const handleStart = (simulationId: number) => {
    setIsLoading(true);
    startSimulation(simulationId);
  };

  const handlePause = (simulationId: number) => {
    setIsLoading(true);
    pauseSimulation(simulationId);
  };

  const handleReset = (simulationId: number) => {
    setIsLoading(true);
    resetSimulation(simulationId);
  };

  const handleJoin = (simulationId: number) => {
    joinSimulation(simulationId);
  };

  const handleLeave = (simulationId: number) => {
    leaveSimulation(simulationId);
  };

  return {
    simulationStatus,
    isLoading,
    isConnected: isConnected(),
    start: handleStart,
    pause: handlePause,
    reset: handleReset,
    join: handleJoin,
    leave: handleLeave
  };
};

// Custom hook for task notifications
export const useTaskNotifications = () => {
  const { onTaskAssigned, onTaskCompleted, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'assignment' | 'completion';
    message: string;
    timestamp: string;
  }>>([]);

  useEffect(() => {
    if (!isConnected()) return;

    const unsubscribeAssigned = onTaskAssigned((data) => {
      setNotifications(prev => [...prev, {
        id: `${data.taskId}-${data.timestamp}`,
        type: 'assignment',
        message: `Task ${data.taskId} assigned to Robot ${data.robotId}`,
        timestamp: data.timestamp
      }]);
    });

    const unsubscribeCompleted = onTaskCompleted((data) => {
      setNotifications(prev => [...prev, {
        id: `${data.taskId}-${data.timestamp}`,
        type: 'completion',
        message: `Task ${data.taskId} completed by Robot ${data.robotId} in ${data.duration}s`,
        timestamp: data.timestamp
      }]);
    });

    return () => {
      unsubscribeAssigned();
      unsubscribeCompleted();
    };
  }, [isConnected, onTaskAssigned, onTaskCompleted]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    clearNotifications,
    removeNotification,
    hasNotifications: notifications.length > 0
  };
};

// Custom hook for battery alerts
export const useBatteryAlerts = () => {
  const { onBatteryAlert, isConnected } = useSocket();
  const [alerts, setAlerts] = useState<Array<{
    robotId: number;
    batteryLevel: number;
    timestamp: string;
    acknowledged: boolean;
  }>>([]);

  useEffect(() => {
    if (!isConnected()) return;

    const unsubscribe = onBatteryAlert((data) => {
      // Avoid duplicate alerts for the same robot
      setAlerts(prev => {
        const existingAlert = prev.find(alert => 
          alert.robotId === data.robotId && !alert.acknowledged
        );
        
        if (existingAlert) {
          return prev; // Don't add duplicate
        }

        return [...prev, {
          robotId: data.robotId,
          batteryLevel: data.battery_level,
          timestamp: data.timestamp,
          acknowledged: false
        }];
      });
    });

    return unsubscribe;
  }, [isConnected, onBatteryAlert]);

  const acknowledgeAlert = (robotId: number) => {
    setAlerts(prev => prev.map(alert => 
      alert.robotId === robotId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  };

  const clearAcknowledgedAlerts = () => {
    setAlerts(prev => prev.filter(alert => !alert.acknowledged));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  return {
    alerts,
    unacknowledgedAlerts,
    acknowledgeAlert,
    clearAcknowledgedAlerts,
    clearAllAlerts,
    hasUnacknowledgedAlerts: unacknowledgedAlerts.length > 0
  };
};

// Custom hook for connection status monitoring
export const useConnectionStatus = () => {
  const { connectionStatus, getConnectionInfo, connect, disconnect } = useSocket();
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    status: string;
    timestamp: string;
  }>>([]);

  const prevStatus = useRef(connectionStatus);

  useEffect(() => {
    if (prevStatus.current !== connectionStatus) {
      setConnectionHistory(prev => [...prev, {
        status: connectionStatus,
        timestamp: new Date().toISOString()
      }].slice(-10)); // Keep only last 10 status changes

      prevStatus.current = connectionStatus;
    }
  }, [connectionStatus]);

  const retry = () => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  };

  return {
    connectionStatus,
    connectionInfo: getConnectionInfo(),
    connectionHistory,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
    retry
  };
};

// Custom hook for error handling
export const useSocketErrors = () => {
  const { onError, isConnected } = useSocket();
  const [errors, setErrors] = useState<Array<{
    id: string;
    message: string;
    timestamp: string;
    dismissed: boolean;
  }>>([]);

  useEffect(() => {
    if (!isConnected()) return;

    const unsubscribe = onError((message) => {
      const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setErrors(prev => [...prev, {
        id: errorId,
        message,
        timestamp: new Date().toISOString(),
        dismissed: false
      }]);
    });

    return unsubscribe;
  }, [isConnected, onError]);

  const dismissError = (id: string) => {
    setErrors(prev => prev.map(error => 
      error.id === id ? { ...error, dismissed: true } : error
    ));
  };

  const clearDismissedErrors = () => {
    setErrors(prev => prev.filter(error => !error.dismissed));
  };

  const clearAllErrors = () => {
    setErrors([]);
  };

  const activeErrors = errors.filter(error => !error.dismissed);

  return {
    errors,
    activeErrors,
    dismissError,
    clearDismissedErrors,
    clearAllErrors,
    hasActiveErrors: activeErrors.length > 0
  };
};