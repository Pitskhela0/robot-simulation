// src/features/simulation-setup/TaskCard.tsx
import React, { useState } from 'react';
import { 
  Task, 
  TASK_TYPE_SPECS, 
  TASK_TYPE_DISPLAY_NAMES,
  TASK_STATUS_DISPLAY_NAMES,
  TASK_STATUS_COLORS
} from '../../types/task';
import { deleteTask } from '../../services/taskService';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onDeleted: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDeleted }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    loading: deleting,
    error: deleteError,
    execute: executeDelete
  } = useApi(deleteTask);

  const taskSpec = TASK_TYPE_SPECS[task.type];
  const displayName = TASK_TYPE_DISPLAY_NAMES[task.type];
  const statusColor = TASK_STATUS_COLORS[task.status];
  const statusDisplay = TASK_STATUS_DISPLAY_NAMES[task.status];

  const handleDelete = async () => {
    if (task.status === 'in_progress' || task.status === 'completed') {
      alert('Cannot delete tasks that are in progress or completed');
      return;
    }

    if (window.confirm(`Are you sure you want to delete this ${displayName.toLowerCase()} task?`)) {
      try {
        await executeDelete(task.id);
        onDeleted();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'High';
    if (priority >= 5) return 'Medium';
    return 'Low';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return '#dc3545';
    if (priority >= 5) return '#ffc107';
    return '#28a745';
  };

  const canDelete = task.status === 'pending' || task.status === 'assigned';

  if (deleting) {
    return (
      <div className="task-card deleting">
        <LoadingSpinner size="small" message="Deleting..." />
      </div>
    );
  }

  return (
    <div className="task-card" style={{ borderLeftColor: taskSpec.color }}>
      <div className="task-card-header">
        <div className="task-info">
          <div className="task-title">
            <span className="task-icon">{taskSpec.icon}</span>
            <span className="task-name">{displayName}</span>
          </div>
          <div className="task-meta">
            <span className="task-location">({task.target_x}, {task.target_y})</span>
            <span 
              className="priority-badge"
              style={{ backgroundColor: getPriorityColor(task.priority) }}
            >
              {getPriorityLabel(task.priority)} ({task.priority})
            </span>
          </div>
        </div>
        <div className="task-actions">
          <button 
            className="details-toggle"
            onClick={toggleDetails}
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? '🔼' : '🔽'}
          </button>
          {canDelete && (
            <Button 
              onClick={handleDelete}
              className="delete-button"
              disabled={deleting}
              title="Delete task"
            >
              🗑️
            </Button>
          )}
        </div>
      </div>

      <div className="task-card-content">
        <div className="task-status">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span 
              className="status-badge"
              style={{ backgroundColor: statusColor }}
            >
              {statusDisplay}
            </span>
          </div>
          
          <div className="status-item">
            <span className="status-label">Estimated Time:</span>
            <span className="status-value">{taskSpec.baseTimeSeconds}s</span>
          </div>

          {task.robot_id && (
            <div className="status-item">
              <span className="status-label">Assigned Robot:</span>
              <span className="status-value">Robot #{task.robot_id}</span>
            </div>
          )}
        </div>

        {showDetails && (
          <div className="task-details">
            {task.description && (
              <div className="task-description">
                <h6>Description</h6>
                <p>{task.description}</p>
              </div>
            )}
            
            <div className="task-timestamps">
              <h6>Timeline</h6>
              <div className="timestamp-grid">
                <div className="timestamp-item">
                  <span className="timestamp-label">Created:</span>
                  <span className="timestamp-value">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {task.started_at && (
                  <div className="timestamp-item">
                    <span className="timestamp-label">Started:</span>
                    <span className="timestamp-value">
                      {new Date(task.started_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {task.completed_at && (
                  <div className="timestamp-item">
                    <span className="timestamp-label">Completed:</span>
                    <span className="timestamp-value">
                      {new Date(task.completed_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteError && (
        <div className="task-card-error">
          <span className="error-text">Failed to delete: {deleteError}</span>
        </div>
      )}
    </div>
  );
};

export default TaskCard;