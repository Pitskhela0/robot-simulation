// frontend/src/components/Simulation/SimulationControls.tsx
import React, { useEffect } from 'react';
import { useSimulationControl, useTaskNotifications } from '../../hooks/useSocket';
import { useSimulation } from '../../context/SimulationContext';
import Button from '../UI/Button';
import LoadingSpinner from '../UI/LoadingSpinner';
import './SimulationControls.css';

interface SimulationControlsProps {
  onSimulationUpdate?: (status: string) => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({ onSimulationUpdate }) => {
  const { simulationId } = useSimulation();
  const { 
    simulationStatus, 
    isLoading, 
    isConnected, 
    start, 
    pause, 
    reset, 
    join, 
    leave 
  } = useSimulationControl();
  
  const { notifications, removeNotification, hasNotifications } = useTaskNotifications();

  // Auto-join simulation when simulationId changes
  useEffect(() => {
    if (simulationId && isConnected) {
      console.log(`🔗 Auto-joining simulation ${simulationId}`);
      join(simulationId);
    }

    // Cleanup: leave simulation when component unmounts or simulationId changes
    return () => {
      if (simulationId && isConnected) {
        console.log(`🔗 Leaving simulation ${simulationId}`);
        leave(simulationId);
      }
    };
  }, [simulationId, isConnected, join, leave]);

  // Notify parent of simulation status updates
  useEffect(() => {
    if (onSimulationUpdate) {
      onSimulationUpdate(simulationStatus);
    }
  }, [simulationStatus, onSimulationUpdate]);

  const handleStart = () => {
    if (simulationId && isConnected) {
      start(simulationId);
    }
  };

  const handlePause = () => {
    if (simulationId && isConnected) {
      pause(simulationId);
    }
  };

  const handleReset = () => {
    if (simulationId && isConnected) {
      if (window.confirm('Are you sure you want to reset the simulation? All progress will be lost.')) {
        reset(simulationId);
      }
    }
  };

  const getStatusColor = () => {
    switch (simulationStatus) {
      case 'running': return '#28a745';
      case 'paused': return '#ffc107';
      case 'completed': return '#17a2b8';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = () => {
    switch (simulationStatus) {
      case 'running': return '▶️';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏹️';
    }
  };

  const canStart = simulationStatus === 'created' || simulationStatus === 'paused';
  const canPause = simulationStatus === 'running';
  const canReset = simulationStatus !== 'created';

  if (!simulationId) {
    return (
      <div className="simulation-controls disabled">
        <div className="status-display">
          <span className="status-icon">⚫</span>
          <span className="status-text">No simulation selected</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="simulation-controls disabled">
        <div className="status-display">
          <span className="status-icon">🔴</span>
          <span className="status-text">WebSocket disconnected</span>
        </div>
        <div className="controls-hint">
          <p>Real-time simulation controls require WebSocket connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simulation-controls">
      {/* Status Display */}
      <div className="status-display">
        <span className="status-icon">{getStatusIcon()}</span>
        <span 
          className="status-text"
          style={{ color: getStatusColor() }}
        >
          {simulationStatus.charAt(0).toUpperCase() + simulationStatus.slice(1)}
        </span>
        {isLoading && <LoadingSpinner size="small" />}
      </div>

      {/* Control Buttons */}
      <div className="control-buttons">
        <Button
          onClick={handleStart}
          disabled={!canStart || isLoading}
          className="start-button"
          title={canStart ? 'Start simulation' : 'Cannot start in current state'}
        >
          {simulationStatus === 'paused' ? '▶️ Resume' : '▶️ Start'}
        </Button>

        <Button
          onClick={handlePause}
          disabled={!canPause || isLoading}
          className="pause-button"
          title={canPause ? 'Pause simulation' : 'Cannot pause in current state'}
        >
          ⏸️ Pause
        </Button>

        <Button
          onClick={handleReset}
          disabled={!canReset || isLoading}
          className="reset-button"
          title={canReset ? 'Reset simulation' : 'Cannot reset in current state'}
        >
          🔄 Reset
        </Button>
      </div>

      {/* Real-time Notifications */}
      {hasNotifications && (
        <div className="notifications-section">
          <h4>📬 Live Updates</h4>
          <div className="notifications-list">
            {notifications.slice(-5).map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.type}`}
              >
                <span className="notification-message">{notification.message}</span>
                <button
                  className="notification-dismiss"
                  onClick={() => removeNotification(notification.id)}
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="connection-indicator">
        <span className="connection-dot connected" title="WebSocket connected"></span>
        <span className="connection-text">Live Updates Active</span>
      </div>
    </div>
  );
};

export default SimulationControls;