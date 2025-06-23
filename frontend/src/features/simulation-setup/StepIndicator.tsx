// src/features/simulation-setup/StepIndicator.tsx
import React from 'react';
import './StepIndicator.css';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="step-indicator">
      <div className="steps-container">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div
              key={step.id}
              className={`step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
            >
              <div className="step-circle">
                {isCompleted ? '✓' : stepNumber}
              </div>
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                {step.description && (
                  <div className="step-description">{step.description}</div>
                )}
              </div>
              {index < steps.length - 1 && <div className="step-connector" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;