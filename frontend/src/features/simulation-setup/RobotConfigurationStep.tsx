// src/features/simulation-setup/RobotConfigurationStep.tsx
import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import RobotList from './RobotList';
import AddRobotForm from './AddRobotForm';
import Grid from '../../components/Grid/Grid';
import { getRobotsBySimulation } from '../../services/robotService';
import { useApi } from '../../hooks/useApi';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import './RobotConfigurationStep.css';

const RobotConfigurationStep: React.FC = () => {
  const { 
    simulationId, 
    width, 
    height, 
    baseStation, 
    robots, 
    setRobots 
  } = useSimulation();
  
  const [showAddForm, setShowAddForm] = useState(false);
  
  const {
    loading: loadingRobots,
    error: loadError,
    execute: loadRobots
  } = useApi(getRobotsBySimulation);

  useEffect(() => {
    if (simulationId) {
      loadRobots(simulationId).then(robotsData => {
        setRobots(robotsData || []);
      }).catch(console.error);
    }
  }, [simulationId, loadRobots, setRobots]);

  const handleAddRobotSuccess = () => {
    setShowAddForm(false);
    // Reload robots list
    if (simulationId) {
      loadRobots(simulationId).then(robotsData => {
        setRobots(robotsData || []);
      }).catch(console.error);
    }
  };

  if (!simulationId) {
    return (
      <ErrorDisplay 
        error="No simulation selected. Please complete the previous steps first." 
        showRetry={false}
      />
    );
  }

  if (loadingRobots) {
    return <LoadingSpinner message="Loading robots..." />;
  }

  return (
    <div className="robot-configuration-step">
      <div className="robot-config-header">
        <h3>Configure Robots</h3>
        <p>Add robots to your simulation. Robots will be placed at the base station.</p>
      </div>

      {loadError && (
        <ErrorDisplay 
          error={loadError} 
          onRetry={() => simulationId && loadRobots(simulationId)}
        />
      )}

      <div className="robot-config-content">
        <div className="robot-controls">
          <div className="robot-stats">
            <div className="stat-item">
              <span className="stat-label">Total Robots:</span>
              <span className="stat-value">{robots.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Base Station:</span>
              <span className="stat-value">
                {baseStation ? `(${baseStation.x}, ${baseStation.y})` : 'Not placed'}
              </span>
            </div>
          </div>

          <RobotList 
            robots={robots}
            onRobotDeleted={handleAddRobotSuccess}
          />

          {!showAddForm ? (
            <button 
              className="add-robot-button"
              onClick={() => setShowAddForm(true)}
              disabled={!baseStation}
            >
              {baseStation ? '+ Add Robot' : 'Place base station first'}
            </button>
          ) : (
            <AddRobotForm
              onSuccess={handleAddRobotSuccess}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </div>

        <div className="robot-grid-preview">
          <h4>Grid Preview</h4>
          <Grid
            width={width}
            height={height}
            baseStation={baseStation}
            robots={robots}
            onCellClick={() => {}}
            mode="view"
          />
        </div>
      </div>
    </div>
  );
};

export default RobotConfigurationStep;