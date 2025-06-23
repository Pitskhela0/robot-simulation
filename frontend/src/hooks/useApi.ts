// src/hooks/useApi.ts
import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T> => {
      setState({ data: null, loading: true, error: null });
      
      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// src/utils/validation.ts
export const validateGridDimensions = (width: number, height: number) => {
  const errors: string[] = [];
  
  if (width < 5 || width > 100) {
    errors.push('Width must be between 5 and 100');
  }
  
  if (height < 5 || height > 100) {
    errors.push('Height must be between 5 and 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSimulationName = (name: string) => {
  const errors: string[] = [];
  
  if (!name.trim()) {
    errors.push('Simulation name is required');
  }
  
  if (name.length > 255) {
    errors.push('Simulation name must be less than 255 characters');
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    errors.push('Simulation name can only contain letters, numbers, spaces, hyphens, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};