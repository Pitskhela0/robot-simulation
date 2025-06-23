// src/features/simulation-setup/SetupWizard.tsx (Enhanced)
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import GridSizeStep from './GridSizestep';
import WizardNavigation from './WizardNavigation';
import StepIndicator from './StepIndicator';
import Grid from '../../components/Grid/Grid';
import ErrorDisplay from '../../components/UI/ErrorDisplay';
import { createSimulation } from '../../services/simulationService';
import { validateGridDimensions, validateSimulationName } from '../../utils/validation';
import { useApi } from '../../hooks/useApi';
import './SetupWizard.css';

const WIZARD_STEPS = [
  {
    id: 1,
    title: 'Configure Grid',
    description: 'Set simulation name and grid dimensions'
  },
  {
    id: 2,
    title: 'Place Base Station',
    description: 'Choose base station location (Coming Soon)'
  },
  {
    id: 3,
    title: 'Add Robots',
    description: 'Configure robots for simulation (Coming Soon)'
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
  const { name, width, height, setSimulationId } = useSimulation();
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const {
    loading: isCreating,
    error: createError,
    execute: executeCreate
  } = useApi(createSimulation);

  const validateCurrentStep = (): boolean => {
    const errors: string[] = [];
    
    if (currentStep === 1) {
      const nameValidation = validateSimulationName(name);
      const gridValidation = validateGridDimensions(width, height);
      
      errors.push(...nameValidation.errors, ...gridValidation.errors);
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < WIZARD_STEPS.length) {
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

    try {
      const newSimulation = await executeCreate({
        name,
        grid_width: width,
        grid_height: height
      });
      
      setSimulationId(newSimulation.id);
      console.log('Simulation created successfully! ID:', newSimulation.id);
      
      // For now, just show success message
      alert('Simulation created successfully! More features coming soon.');
    } catch (err) {
      console.error('Failed to create simulation:', err);
    }
  };

  const handleCellClick = (x: number, y: number) => {
    console.log(`Grid cell clicked: (${x}, ${y})`);
    // Future: Handle different interactions based on current step
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <GridSizeStep />;
      case 2:
        return (
          <div className="coming-soon-step">
            <h3>Base Station Placement</h3>
            <p>This feature will allow you to click on the grid to place the base station.</p>
            <p><em>Coming in the next phase of development!</em></p>
          </div>
        );
      case 3:
        return (
          <div className="coming-soon-step">
            <h3>Robot Configuration</h3>
            <p>This feature will allow you to add and configure robots with different versions.</p>
            <p><em>Coming in the next phase of development!</em></p>
          </div>
        );
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
            isNextDisabled={validationErrors.length > 0}
            isLoading={isCreating}
            nextButtonText={getNextButtonText()}
          />
        </div>

        <div className="wizard-preview">
          <h4>Live Preview</h4>
          <div className="preview-info">
            <p><strong>Name:</strong> {name || 'Untitled Simulation'}</p>
            <p><strong>Dimensions:</strong> {width} × {height}</p>
            <p><strong>Total Cells:</strong> {width * height}</p>
          </div>
          <Grid width={width} height={height} onCellClick={handleCellClick} />
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;