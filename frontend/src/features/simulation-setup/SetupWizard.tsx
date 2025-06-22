// src/features/simulation-setup/SetupWizard.tsx
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import GridSizeStep from './GridSizestep';
import Grid from '../../components/Grid/Grid';
import Button from '../../components/UI/Button';
import { createSimulation } from '../../services/simulationService'; // We will create this next
import './SetupWizard.css';

const SetupWizard = () => {
  const { name, width, height, setSimulationId } = useSimulation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSimulation = async () => {
    setError(null);
    setIsLoading(true);

    // Basic validation
    if (width < 5 || width > 100 || height < 5 || height > 100) {
      setError('Grid dimensions must be between 5 and 100.');
      setIsLoading(false);
      return;
    }

    try {
      const newSimulation = await createSimulation({ name, grid_width: width, grid_height: height });
      setSimulationId(newSimulation.id);
      console.log('Simulation created successfully! ID:', newSimulation.id);
      // In the future, we would navigate to the next step here
    } catch (err) {
      setError('Failed to create simulation. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCellClick = (x: number, y: number) => {
    // This will be used in a later step
    console.log(`Preview cell clicked: (${x}, ${y})`);
  };

  return (
    <div className="setup-wizard">
      <div className="wizard-controls">
        <GridSizeStep />
        <Button onClick={handleCreateSimulation} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create & Go to Next Step'}
        </Button>
        {error && <p className="error-message">{error}</p>}
      </div>
      <div className="wizard-preview">
        <h4>Live Preview</h4>
        <Grid width={width} height={height} onCellClick={handleCellClick} />
      </div>
    </div>
  );
};

export default SetupWizard;