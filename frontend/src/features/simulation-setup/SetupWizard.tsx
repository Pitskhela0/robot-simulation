// src/features/simulation-setup/SetupWizard.tsx 
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import GridSizeStep from './GridSizestep';
import BaseStationStep from './BaseStationStep';
import RobotConfigurationStep from './RobotConfigurationStep';
import WizardNavigation from './WizardNavigation';
import StepIndicator from './StepIndicator';
import Grid from '../../components/Grid/Grid';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import { createSimulation } from '../../services/simulationService';
import { validateGridDimensions, validateSimulationName } from '../../utils/validation';
import { useApi } from '../../hooks/useApi';
import './setupWizard.css';

const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Configure Grid',
    description: 'Set simulation name and grid dimensions'
  },
  {
    id: 2,
    title: 'Place Base Station',
    description: 'Choose base station location'
  },
  {
    id: 3,
    title: 'Add Robots',
    description: 'Configure robots for simulation'
  },
  {
    id: 4,
    title: 'Place Walls',
    description: 'Add obstacles to the grid (Coming Soon)'
  },
  {
    id: 5,
    title: 'Add Tasks',
    description: 'Define tasks for robots (Coming Soon)'
  }
];

const SetupWizard: React.FC = () => {
  const { 
    name, 
    width, 
    height, 
    baseStation, 
    robots,
    simulationId, 
    setSimulationId 
  } = useSimulation();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const {
    loading: isCreating,
    error: createError,
    execute: executeCreate
  } = useApi(createSimulation);

  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];
    
    switch (currentStep) {
      case 1:
        const nameValidation = validateSimulationName(name);
        const gridValidation = validateGridDimensions(width, height);
        errors.push(...nameValidation.errors, ...gridValidation.errors);
        break;
      
      case 2:
        if (!baseStation) {
          errors.push('Please place the base station on the grid');
        }
        break;
      
      case 3:
        if (!baseStation) {
          errors.push('Base station must be placed before configuring robots');
        }
        if (robots.length === 0) {
          errors.push('At least one robot is required for the simulation');
        }
        break;
      
      case 4:
      case 5:
        // Future validation for walls and tasks
        break;
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1 && !simulationId) {
      // Create simulation on first step
      if (!validateCurrentStep()) {
        return;
      }

      try {
        const newSimulation = await executeCreate({
          name,
          grid_width: width,
          grid_height: height
        });
        
        setSimulationId(newSimulation.id);
        setCurrentStep(currentStep + 1);
      } catch (err) {
        console.error('Failed to create simulation:', err);
      }
    } else {
      // Regular step validation and navigation
      if (validateCurrentStep() && currentStep < WIZARD_STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors([]);
    }
  };

  const handleFinish = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    alert(`Simulation setup complete! 
    - Grid: ${width}×${height}
    - Base Station: (${baseStation?.x}, ${baseStation?.y})
    - Robots: ${robots.length}
    
    Ready for the next phase of development!`);
  };

  const handleCellClick = (x: number, y: number) => {
    console.log(`Grid cell clicked: (${x}, ${y})`);
    // Cell clicks are handled by individual step components
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <GridSizeStep />;
      case 2:
        return <BaseStationStep />;
      case 3:
        return <RobotConfigurationStep />;
      case 4:
        return (
          <div className="coming-soon-step">
            <h3>Wall Placement</h3>
            <p>This feature will allow you to click on the grid to place walls and obstacles.</p>
            <p><em>Coming in the next phase of development!</em></p>
          </div>
        );
      case 5:
        return (
          <div className="coming-soon-step">
            <h3>Task Configuration</h3>
            <p>This feature will allow you to add tasks with different types and priorities.</p>
            <p><em>Coming in the next phase of development!</em></p>
          </div>
        );
      default:
        return <GridSizeStep />;
    }
  };

  const getNextButtonText = () => {
    if (currentStep === 1) return 'Create & Continue';
    if (currentStep === WIZARD_STEPS.length) return 'Finish Setup';
    return 'Next';
  };

  const canNavigateNext = () => {
    if (currentStep === 1) return true; // Validation handled in handleNext
    if (currentStep === 2) return baseStation !== null;
    if (currentStep === 3) return baseStation !== null && robots.length > 0;
    return true;
  };

  return (
    <div className="setup-wizard">
      <div className="wizard-header">
        <h2>Create New Simulation</h2>
        <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} />
      </div>

      <div className="wizard-content">
        <div className="wizard-controls">
          {renderCurrentStep()}
          
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <h4>Please fix the following errors:</h4>
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

          <WizardNavigation
            currentStep={currentStep}
            totalSteps={WIZARD_STEPS.length}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onFinish={handleFinish}
            isNextDisabled={!canNavigateNext()}
            isLoading={isCreating}
            nextButtonText={getNextButtonText()}
          />
        </div>

        {(currentStep === 1 || currentStep >= 4) && (
          <div className="wizard-preview">
            <h4>Live Preview</h4>
            <div className="preview-info">
              <p><strong>Name:</strong> {name || 'Untitled Simulation'}</p>
              <p><strong>Dimensions:</strong> {width} × {height}</p>
              <p><strong>Base Station:</strong> {baseStation ? `(${baseStation.x}, ${baseStation.y})` : 'Not placed'}</p>
              <p><strong>Robots:</strong> {robots.length}</p>
            </div>
            <Grid 
              width={width} 
              height={height} 
              baseStation={baseStation}
              robots={robots}
              onCellClick={handleCellClick} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;