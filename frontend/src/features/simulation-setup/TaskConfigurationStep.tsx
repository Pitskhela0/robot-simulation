// src/features/simulation-setup/TaskConfigurationStep.tsx
import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { getTasksBySimulation } from '../../services/taskService';
import { getWallsBySimulation } from '../../services/wallService';
import { Task } from '../../types/task';
import { Wall } from '../../types/grid';
import { useApi } from '../../hooks/useApi';
import TaskList from './TaskList';
import AddTaskForm from './AddTaskForm';
import Grid from '../../components/Grid/Grid';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import './TaskConfigurationStep.css';

const TaskConfigurationStep: React.FC = () => {
  const { 
    simulationId, 
    width, 
    height, 
    baseStation, 
    robots 
  } = useSimulation();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const {
    loading: loadingTasks,
    error: loadTasksError,
    execute: loadTasks
  } = useApi(getTasksBySimulation);

  const {
    loading: loadingWalls,
    error: loadWallsError,
    execute: loadWalls
  } = useApi(getWallsBySimulation);

  useEffect(() => {
    if (simulationId) {
      // Load tasks
      loadTasks(simulationId).then(tasksData => {
        setTasks(tasksData || []);
      }).catch(console.error);

      // Load walls for validation
      loadWalls(simulationId).then(wallsData => {
        setWalls(wallsData || []);
      }).catch(console.error);
    }
  }, [simulationId, loadTasks, loadWalls]);

  const handleAddTaskSuccess = () => {
    setShowAddForm(false);
    // Reload tasks list
    if (simulationId) {
      loadTasks(simulationId).then(tasksData => {
        setTasks(tasksData || []);
      }).catch(console.error);
    }
  };

  const getTaskStats = () => {
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      assigned: tasks.filter(t => t.status === 'assigned').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      byType: {
        pickup: tasks.filter(t => t.type === 'pickup').length,
        putdown: tasks.filter(t => t.type === 'putdown').length,
        cleaning: tasks.filter(t => t.type === 'cleaning').length,
        inspection: tasks.filter(t => t.type === 'inspection').length,
      }
    };
    return stats;
  };

  if (!simulationId) {
    return (
      <ErrorDisplay 
        error="No simulation selected. Please complete the previous steps first." 
        showRetry={false}
      />
    );
  }

  if (loadingTasks || loadingWalls) {
    return <LoadingSpinner message="Loading tasks..." />;
  }

  const stats = getTaskStats();

  return (
    <div className="task-configuration-step">
      <div className="task-config-header">
        <h3>Configure Tasks</h3>
        <p>Add tasks for robots to complete during the simulation.</p>
      </div>

      {(loadTasksError || loadWallsError) && (
        <ErrorDisplay 
          error={loadTasksError || loadWallsError || 'An error occurred'} 
          onRetry={() => {
            if (simulationId) {
              loadTasks(simulationId);
              loadWalls(simulationId);
            }
          }}
        />
      )}

      <div className="task-config-content">
        <div className="task-controls">
          <div className="task-stats">
            <div className="stat-item">
              <span className="stat-label">Total Tasks:</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending:</span>
              <span className="stat-value">{stats.pending}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Robots Available:</span>
              <span className="stat-value">{robots.length}</span>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="task-type-breakdown">
              <h5>Task Breakdown</h5>
              <div className="breakdown-grid">
                <div className="breakdown-item">
                  <span className="breakdown-icon">📦</span>
                  <span className="breakdown-label">Pickup:</span>
                  <span className="breakdown-value">{stats.byType.pickup}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-icon">📋</span>
                  <span className="breakdown-label">Put Down:</span>
                  <span className="breakdown-value">{stats.byType.putdown}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-icon">🧹</span>
                  <span className="breakdown-label">Cleaning:</span>
                  <span className="breakdown-value">{stats.byType.cleaning}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-icon">🔍</span>
                  <span className="breakdown-label">Inspection:</span>
                  <span className="breakdown-value">{stats.byType.inspection}</span>
                </div>
              </div>
            </div>
          )}

          <TaskList 
            tasks={tasks}
            onTaskDeleted={handleAddTaskSuccess}
          />

          {!showAddForm ? (
            <button 
              className="add-task-button"
              onClick={() => setShowAddForm(true)}
            >
              + Add Task
            </button>
          ) : (
            <AddTaskForm
              onSuccess={handleAddTaskSuccess}
              onCancel={() => setShowAddForm(false)}
              existingTasks={tasks.map(t => ({ target_x: t.target_x, target_y: t.target_y }))}
              walls={walls.map(w => ({ x_position: w.x_position, y_position: w.y_position }))}
            />
          )}
        </div>

        <div className="task-grid-preview">
          <h4>Grid Preview</h4>
          <Grid
            width={width}
            height={height}
            baseStation={baseStation}
            robots={robots}
            walls={walls}
            tasks={tasks}
            onCellClick={() => {}}
            mode="view"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskConfigurationStep;