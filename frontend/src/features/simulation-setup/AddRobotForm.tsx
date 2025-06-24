// src/features/simulation-setup/AddRobotForm.tsx
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { createRobot } from '../../services/robotService';
import { RobotVersion, ROBOT_VERSION_DISPLAY_NAMES, ROBOT_CAPABILITIES } from '../../types/robot';
import { validateRobotName } from '../../utils/validation';
import { useApi } from '../../hooks/useApi';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Button from '../../components/UI/Button';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import './AddRobotForm.css';

interface AddRobotFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ROBOT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const AddRobotForm: React.FC<AddRobotFormProps> = ({ onSuccess, onCancel }) => {
  const { simulationId, baseStation, addRobot } = useSimulation();
  const [formData, setFormData] = useState({
    name: '',
    version: RobotVersion.V1,
    color: ROBOT_COLORS[0]
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const {
    loading: creating,
    error: createError,
    execute: executeCreate
  } = useApi(createRobot);

  const validateForm = () => {
    const errors: string[] = [];
    
    const nameValidation = validateRobotName(formData.name);
    errors.push(...nameValidation.errors);
    
    if (!formData.version) {
      errors.push('Robot version is required');
    }
    
    if (!baseStation) {
      errors.push('Base station must be placed before adding robots');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !simulationId || !baseStation) {
      return;
    }

    const capabilities = ROBOT_CAPABILITIES[formData.version];
    
    const robotPayload = {
      name: formData.name,
      version: formData.version,
      x_position: baseStation.x,
      y_position: baseStation.y,
      battery_level: capabilities.batteryCapacity,
      color: formData.color
    };

    try {
      const newRobot = await executeCreate(simulationId, robotPayload);
      addRobot(newRobot); // Optimistic update
      onSuccess();
    } catch (error) {
      console.error('Failed to create robot:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const versionOptions = Object.values(RobotVersion).map(version => ({
    value: version,
    label: ROBOT_VERSION_DISPLAY_NAMES[version]
  }));

  const selectedCapabilities = ROBOT_CAPABILITIES[formData.version];

  return (
    <div className="add-robot-form">
      <div className="form-header">
        <h4>Add New Robot</h4>
        <p>Robot will be placed at the base station ({baseStation?.x}, {baseStation?.y})</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="robot-name">Robot Name:</label>
          <Input
            id="robot-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter robot name"
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label htmlFor="robot-version">Robot Version:</label>
          <Select
            id="robot-version"
            value={formData.version}
            onChange={(e) => handleInputChange('version', e.target.value)}
            options={versionOptions}
          />
        </div>

        <div className="form-group">
          <label htmlFor="robot-color">Robot Color:</label>
          <div className="color-selector">
            {ROBOT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className={`color-option ${formData.color === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleInputChange('color', color)}
                title={`Select ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="capabilities-preview">
          <h5>Robot Capabilities</h5>
          <div className="capability-grid">
            <div className="capability-item">
              <span className="capability-label">Task Speed:</span>
              <span className="capability-value">{selectedCapabilities.taskSpeedMultiplier}x</span>
            </div>
            <div className="capability-item">
              <span className="capability-label">Battery Capacity:</span>
              <span className="capability-value">{selectedCapabilities.batteryCapacity}%</span>
            </div>
            <div className="capability-item">
              <span className="capability-label">Charge Speed:</span>
              <span className="capability-value">{selectedCapabilities.chargeSpeedMultiplier}x</span>
            </div>
          </div>
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
            {creating ? 'Adding Robot...' : 'Add Robot'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddRobotForm;