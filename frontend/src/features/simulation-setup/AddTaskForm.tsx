// src/features/simulation-setup/AddTaskForm.tsx
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { createTask } from '../../services/taskService';
import { 
  TaskType, 
  TASK_TYPE_DISPLAY_NAMES, 
  TASK_TYPE_SPECS,
  CreateTaskPayload 
} from '../../types/task';
import { validateTaskForm, validateTaskPlacement } from '../../utils/taskValidation';
import { useApi } from '../../hooks/useApi';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Button from '../../components/UI/Button';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import './AddTaskForm.css';

interface AddTaskFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  existingTasks: Array<{ target_x: number; target_y: number }>;
  walls: Array<{ x_position: number; y_position: number }>;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ 
  onSuccess, 
  onCancel, 
  existingTasks,
  walls 
}) => {
  const { simulationId, width, height, baseStation, robots } = useSimulation();
  const [formData, setFormData] = useState({
    type: TaskType.PICKUP,
    target_x: 0,
    target_y: 0,
    priority: 1,
    description: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    loading: creating,
    error: createError,
    execute: executeCreate
  } = useApi(createTask);

  const validateForm = () => {
    const errors: string[] = [];
    
    // Basic form validation
    const formValidation = validateTaskForm(formData, width, height);
    errors.push(...formValidation.errors);
    
    // Placement validation
    const placementValidation = validateTaskPlacement(
      formData.target_x,
      formData.target_y,
      baseStation,
      robots,
      walls
    );
    errors.push(...placementValidation.errors);
    
    // Check for duplicate task at same location
    const existingTaskAtLocation = existingTasks.find(
      task => task.target_x === formData.target_x && task.target_y === formData.target_y
    );
    if (existingTaskAtLocation) {
      errors.push('A task already exists at this location');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !simulationId) {
      return;
    }

    const taskPayload: CreateTaskPayload = {
      type: formData.type,
      target_x: formData.target_x,
      target_y: formData.target_y,
      priority: formData.priority,
      description: formData.description.trim() || undefined
    };

    try {
      await executeCreate(simulationId, taskPayload);
      onSuccess();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const taskTypeOptions = Object.values(TaskType).map(type => ({
    value: type,
    label: TASK_TYPE_DISPLAY_NAMES[type]
  }));

  const priorityOptions = Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `Priority ${i + 1}${i === 9 ? ' (Highest)' : i === 0 ? ' (Lowest)' : ''}`
  }));

  const selectedTaskSpec = TASK_TYPE_SPECS[formData.type];

  return (
    <div className="add-task-form">
      <div className="form-header">
        <h4>Add New Task</h4>
        <p>Configure a task for robots to complete</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="task-type">Task Type:</label>
          <Select
            id="task-type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            options={taskTypeOptions}
          />
        </div>

        <div className="task-type-preview">
          <div className="task-icon">{selectedTaskSpec.icon}</div>
          <div className="task-info">
            <h5>{TASK_TYPE_DISPLAY_NAMES[formData.type]}</h5>
            <p>{selectedTaskSpec.description}</p>
            <small>Estimated time: {selectedTaskSpec.baseTimeSeconds}s</small>
          </div>
        </div>

        <div className="coordinate-group">
          <div className="form-group">
            <label htmlFor="target-x">Target X Coordinate:</label>
            <Input
              id="target-x"
              type="number"
              value={formData.target_x.toString()}
              onChange={(e) => handleInputChange('target_x', parseInt(e.target.value) || 0)}
              min="0"
              max={width - 1}
            />
            <small>Range: 0 to {width - 1}</small>
          </div>

          <div className="form-group">
            <label htmlFor="target-y">Target Y Coordinate:</label>
            <Input
              id="target-y"
              type="number"
              value={formData.target_y.toString()}
              onChange={(e) => handleInputChange('target_y', parseInt(e.target.value) || 0)}
              min="0"
              max={height - 1}
            />
            <small>Range: 0 to {height - 1}</small>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="task-priority">Priority:</label>
          <Select
            id="task-priority"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
            options={priorityOptions}
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-description">Description (Optional):</label>
          <textarea
            id="task-description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter task description..."
            maxLength={500}
            rows={3}
            className="custom-textarea"
          />
          <small>{formData.description.length}/500 characters</small>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            <h6>Please fix the following errors:</h6>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {createError && (
          <ErrorDisplay 
            error={createError} 
            showRetry={false}
          />
        )}

        <div className="form-actions">
          <Button 
            type="button" 
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={creating || validationErrors.length > 0}
          >
            {creating ? 'Adding Task...' : 'Add Task'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddTaskForm;