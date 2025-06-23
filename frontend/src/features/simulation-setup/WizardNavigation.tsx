// src/features/simulation-setup/WizardNavigation.tsx
import React from 'react';
import Button from '../../components/UI/Button';
import './WizardNavigation.css';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onFinish?: () => void;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  nextButtonText?: string;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onFinish,
  isNextDisabled = false,
  isLoading = false,
  nextButtonText
}) => {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const getNextButtonText = () => {
    if (nextButtonText) return nextButtonText;
    if (isLastStep) return 'Finish';
    return 'Next';
  };

  const handleNextClick = () => {
    if (isLastStep && onFinish) {
      onFinish();
    } else {
      onNext();
    }
  };

  return (
    <div className="wizard-navigation">
      <div className="nav-buttons">
        <Button
          onClick={onPrevious}
          disabled={isFirstStep || isLoading}
          type="button"
        >
          Previous
        </Button>
        
        <Button
          onClick={handleNextClick}
          disabled={isNextDisabled || isLoading}
          type="button"
        >
          {isLoading ? 'Loading...' : getNextButtonText()}
        </Button>
      </div>
    </div>
  );
};

export default WizardNavigation;