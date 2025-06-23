// src/utils/validation.ts

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates grid dimensions for simulation setup
 * @param width Grid width (must be between 5-100)
 * @param height Grid height (must be between 5-100)
 * @returns ValidationResult with validity status and error messages
 */
export const validateGridDimensions = (width: number, height: number): ValidationResult => {
  const errors: string[] = [];
  
  // Validate width
  if (width < 5 || width > 100) {
    errors.push('Width must be between 5 and 100');
  }
  
  if (!Number.isInteger(width)) {
    errors.push('Width must be a whole number');
  }
  
  // Validate height
  if (height < 5 || height > 100) {
    errors.push('Height must be between 5 and 100');
  }
  
  if (!Number.isInteger(height)) {
    errors.push('Height must be a whole number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates simulation name
 * @param name Simulation name to validate
 * @returns ValidationResult with validity status and error messages
 */
export const validateSimulationName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  // Check if name is empty or only whitespace
  if (!name.trim()) {
    errors.push('Simulation name is required');
  }
  
  // Check length
  if (name.length > 255) {
    errors.push('Simulation name must be less than 255 characters');
  }
  
  // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    errors.push('Simulation name can only contain letters, numbers, spaces, hyphens, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates coordinates within grid bounds
 * @param x X coordinate
 * @param y Y coordinate
 * @param gridWidth Grid width boundary
 * @param gridHeight Grid height boundary
 * @returns ValidationResult with validity status and error messages
 */
export const validateCoordinates = (
  x: number, 
  y: number, 
  gridWidth: number, 
  gridHeight: number
): ValidationResult => {
  const errors: string[] = [];
  
  // Check if coordinates are non-negative integers
  if (!Number.isInteger(x) || x < 0) {
    errors.push('X coordinate must be a non-negative integer');
  }
  
  if (!Number.isInteger(y) || y < 0) {
    errors.push('Y coordinate must be a non-negative integer');
  }
  
  // Check if coordinates are within grid bounds
  if (x >= gridWidth) {
    errors.push(`X coordinate must be less than grid width (${gridWidth})`);
  }
  
  if (y >= gridHeight) {
    errors.push(`Y coordinate must be less than grid height (${gridHeight})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates robot name
 * @param name Robot name to validate
 * @returns ValidationResult with validity status and error messages
 */
export const validateRobotName = (name: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!name.trim()) {
    errors.push('Robot name is required');
  }
  
  if (name.length > 100) {
    errors.push('Robot name must be less than 100 characters');
  }
  
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    errors.push('Robot name can only contain letters, numbers, spaces, hyphens, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates battery level for a given robot version
 * @param batteryLevel Battery level to validate
 * @param robotVersion Robot version (V1, V2, V3)
 * @returns ValidationResult with validity status and error messages
 */
export const validateBatteryLevel = (
  batteryLevel: number, 
  robotVersion: 'V1' | 'V2' | 'V3'
): ValidationResult => {
  const errors: string[] = [];
  
  const maxCapacity = {
    'V1': 100,
    'V2': 150,
    'V3': 200
  };
  
  const maxBattery = maxCapacity[robotVersion];
  
  if (!Number.isInteger(batteryLevel)) {
    errors.push('Battery level must be a whole number');
  }
  
  if (batteryLevel < 0) {
    errors.push('Battery level cannot be negative');
  }
  
  if (batteryLevel > maxBattery) {
    errors.push(`Battery level cannot exceed ${maxBattery}% for ${robotVersion} robots`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates task priority
 * @param priority Task priority to validate (1-10)
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskPriority = (priority: number): ValidationResult => {
  const errors: string[] = [];
  
  if (!Number.isInteger(priority)) {
    errors.push('Priority must be a whole number');
  }
  
  if (priority < 1 || priority > 10) {
    errors.push('Priority must be between 1 and 10');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates task description
 * @param description Task description to validate
 * @returns ValidationResult with validity status and error messages
 */
export const validateTaskDescription = (description: string): ValidationResult => {
  const errors: string[] = [];
  
  if (description.length > 500) {
    errors.push('Task description must be less than 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates email format
 * @param email Email to validate
 * @returns ValidationResult with validity status and error messages
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!email.trim()) {
    errors.push('Email is required');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (email.length > 255) {
    errors.push('Email must be less than 255 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates color hex code
 * @param color Color hex code to validate (e.g., #FF0000)
 * @returns ValidationResult with validity status and error messages
 */
export const validateColorHex = (color: string): ValidationResult => {
  const errors: string[] = [];
  
  const hexRegex = /^#[0-9A-F]{6}$/i;
  if (!hexRegex.test(color)) {
    errors.push('Color must be a valid hex code (e.g., #FF0000)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates multiple fields and combines results
 * @param validations Array of validation results
 * @returns Combined ValidationResult
 */
export const combineValidations = (...validations: ValidationResult[]): ValidationResult => {
  const allErrors = validations.flatMap(validation => validation.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Validates form step completion for wizard
 * @param stepData Object containing step data to validate
 * @param stepNumber Current step number
 * @returns ValidationResult with validity status and error messages
 */
export const validateWizardStep = (stepData: any, stepNumber: number): ValidationResult => {
  switch (stepNumber) {
    case 1: // Grid Configuration Step
      return combineValidations(
        validateSimulationName(stepData.name || ''),
        validateGridDimensions(stepData.width || 0, stepData.height || 0)
      );
      
    case 2: // Base Station Step (future implementation)
      return { isValid: true, errors: [] };
      
    case 3: // Robot Configuration Step (future implementation)
      return { isValid: true, errors: [] };
      
    case 4: // Wall Placement Step (future implementation)
      return { isValid: true, errors: [] };
      
    case 5: // Task Configuration Step (future implementation)
      return { isValid: true, errors: [] };
      
    default:
      return { isValid: false, errors: ['Invalid step number'] };
  }
};

/**
 * Utility function to check if a value is a valid number
 * @param value Value to check
 * @returns boolean indicating if value is a valid number
 */
export const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * Utility function to sanitize input strings
 * @param input Input string to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

/**
 * Utility function to format validation errors for display
 * @param errors Array of error messages
 * @returns Formatted error string
 */
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  
  return `${errors.slice(0, -1).join(', ')}, and ${errors[errors.length - 1]}`;
};