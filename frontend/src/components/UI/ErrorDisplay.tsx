// src/components/UI/ErrorDisplay.tsx
import React from 'react';
import './ErrorDisplay.css';

interface ErrorDisplayProps {
  error: string | Error;
  onRetry?: () => void;
  showRetry?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  showRetry = true 
}) => {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <h3>Something went wrong</h3>
      <p className="error-message">{errorMessage}</p>
      {showRetry && onRetry && (
        <button className="retry-button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;