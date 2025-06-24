// src/features/simulation-setup/RobotCard.tsx
import React, { useState } from 'react';
import { Robot, ROBOT_CAPABILITIES, ROBOT_VERSION_DISPLAY_NAMES } from '../../types/robot';
import { deleteRobot } from '../../services/robotService';
import { useSimulation } from '../../context/SimulationContext';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './RobotCard.css';

interface RobotCardProps {
  robot: Robot;
  onDeleted: () => void;
}

const RobotCard: React.FC<RobotCardProps> = ({ robot, onDeleted }) => {
  const { removeRobot } = useSimulation();
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    loading: deleting,
    error: deleteError,
    execute: executeDelete
  } = useApi(deleteRobot);

  const capabilities = ROBOT_CAPABILITIES[robot.version];
  const displayName = ROBOT_VERSION_DISPLAY_NAMES[robot.version];

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${robot.name}?`)) {
      try {
        await executeDelete(robot.id);
        removeRobot(robot.id); // Optimistic update
        onDeleted();
      } catch (error) {
        console.error('Failed to delete robot:', error);
      }
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const getBatteryColor = () => {
    if (robot.battery_level >= 80) return '#28a745';
    if (robot.battery_level >= 50) return '#ffc107';
    if (robot.battery_level >= 20) return '#fd7e14';
    return '#dc3545';
  };

  const getStatusColor = () => {
    switch (robot.status) {
      case 'idle': return '#6c757d';
      case 'moving': return '#007bff';
      case 'working': return '#28a745';
      case 'charging': return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (deleting) {
    return (
      <div className="robot-card deleting">
        <LoadingSpinner size="small" message="Deleting..." />
      </div>
    );
  }

  return (
    <div className="robot-card" style={{ borderLeftColor: robot.color }}>
      <div className="robot-card-header">
        <div className="robot-info">
          <h5 className="robot-name">{robot.name}</h5>
          <span className="robot-version">{displayName}</span>
        </div>
        <div className="robot-actions">
          <button 
            className="details-toggle"
            onClick={toggleDetails}
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? '🔼' : '🔽'}
          </button>
          <Button 
            onClick={handleDelete}
            className="delete-button"
            disabled={deleting}
            title="Delete robot"
          >
            🗑️
          </Button>
        </div>
      </div>

      <div className="robot-card-content">
        <div className="robot-status">
          <div className="status-item">
            <span className="status-label">Position:</span>
            <span className="status-value">({robot.x_position}, {robot.y_position})</span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Battery:</span>
            <div className="battery-indicator">
              <div 
                className="battery-bar"
                style={{ 
                  width: `${robot.battery_level}%`,
                  backgroundColor: getBatteryColor()
                }}
              />
              <span className="battery-text">{robot.battery_level}%</span>
            </div>
          </div>

          <div className="status-item">
            <span className="status-label">Status:</span>
            <span 
              className="status-badge"
              style={{ backgroundColor: getStatusColor() }}
            >
              {robot.status}
            </span>
          </div>
        </div>

        {showDetails && (
          <div className="robot-details">
            <div className="capabilities">
              <h6>Capabilities</h6>
              <div className="capability-grid">
                <div className="capability-item">
                  <span className="capability-label">Speed:</span>
                  <span className="capability-value">{capabilities.taskSpeedMultiplier}x</span>
                </div>
                <div className="capability-item">
                  <span className="capability-label">Max Battery:</span>
                  <span className="capability-value">{capabilities.batteryCapacity}%</span>
                </div>
                <div className="capability-item">
                  <span className="capability-label">Charge Speed:</span>
                  <span className="capability-value">{capabilities.chargeSpeedMultiplier}x</span>
                </div>
                <div className="capability-item">
                  <span className="capability-label">Direction:</span>
                  <span className="capability-value">{robot.direction}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteError && (
        <div className="robot-card-error">
          <span className="error-text">Failed to delete: {deleteError}</span>
        </div>
      )}
    </div>
  );
};

export default RobotCard;