// frontend/src/components/WebSocket/ConnectionStatus.tsx
import React, { useState } from 'react';
import { useConnectionStatus, useSocketErrors, useBatteryAlerts } from '../../hooks/useSocket';
import './ConnectionStatus.css';

const ConnectionStatus: React.FC = () => {
  const { connectionStatus, isConnected, isConnecting, hasError, retry } = useConnectionStatus();
  const { activeErrors, dismissError, hasActiveErrors } = useSocketErrors();
  const { unacknowledgedAlerts, acknowledgeAlert, hasUnacknowledgedAlerts } = useBatteryAlerts();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    if (isConnected) return '🟢';
    if (isConnecting) return '🟡';
    if (hasError) return '🔴';
    return '⚫';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    if (hasError) return 'Connection Error';
    return 'Disconnected';
  };

  const getStatusClass = () => {
    return `connection-status ${connectionStatus} ${isExpanded ? 'expanded' : ''}`;
  };

  return (
    <div className={getStatusClass()}>
      <div 
        className="status-indicator"
        onClick={() => setIsExpanded(!isExpanded)}
        title={`WebSocket: ${getStatusText()}`}
      >
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
        
        {/* Notification badges */}
        {hasActiveErrors && (
          <span className="notification-badge error-badge" title="Active errors">
            {activeErrors.length}
          </span>
        )}
        {hasUnacknowledgedAlerts && (
          <span className="notification-badge alert-badge" title="Battery alerts">
            {unacknowledgedAlerts.length}
          </span>
        )}
        
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="status-details">
          {/* Connection Actions */}
          <div className="connection-actions">
            {hasError && (
              <button className="retry-button" onClick={retry}>
                🔄 Retry Connection
              </button>
            )}
          </div>

          {/* Active Errors */}
          {hasActiveErrors && (
            <div className="errors-section">
              <h4>🚨 Connection Errors</h4>
              {activeErrors.map(error => (
                <div key={error.id} className="error-item">
                  <span className="error-message">{error.message}</span>
                  <button 
                    className="dismiss-button"
                    onClick={() => dismissError(error.id)}
                    title="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Battery Alerts */}
          {hasUnacknowledgedAlerts && (
            <div className="alerts-section">
              <h4>🔋 Battery Alerts</h4>
              {unacknowledgedAlerts.map(alert => (
                <div key={alert.robotId} className="alert-item">
                  <span className="alert-message">
                    Robot {alert.robotId}: {alert.batteryLevel}% battery
                  </span>
                  <button 
                    className="acknowledge-button"
                    onClick={() => acknowledgeAlert(alert.robotId)}
                    title="Acknowledge alert"
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Connection Info */}
          <div className="connection-info">
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className="info-value">{connectionStatus}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Update:</span>
              <span className="info-value">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;