// src/components/Auth/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import './AuthForms.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  onSwitchToForgotPassword,
}) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async () => {
    
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData.email, formData.password, formData.rememberMe);
      onSuccess?.();
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>Welcome Back</h2>
        <p>Sign in to your account to continue</p>
      </div>

      <div className="auth-form-
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className={validationErrors.email ? 'error' : ''}
          />
          {validationErrors.email && (
            <span className="error-text">{validationErrors.email}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            className={validationErrors.password ? 'error' : ''}
          />
          {validationErrors.password && (
            <span className="error-text">{validationErrors.password}</span>
          )}
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
              disabled={isLoading}
            />
            <span className="checkbox-text">Remember me</span>
          </label>
        </div>

        {error && (
          <div className="auth-error">
            <span className="error-text">{error}</span>
          </div>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="auth-submit-button"
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Sign In'}
        </Button>

        <div className="auth-links">
          <button
            type="button"
            onClick={onSwitchToForgotPassword}
            className="auth-link"
            disabled={isLoading}
          >
            Forgot your password?
          </button>
        </div>

        <div className="auth-switch">
          <span>Don't have an account? </span>
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="auth-link"
            disabled={isLoading}
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

// src/components/Auth/RegisterForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async () => {
    
    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      });
      onSuccess?.();
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>Create Account</h2>
        <p>Sign up to get started with Robot Simulator</p>
      </div>

      <div className="auth-form-content">

        {/* Submit handler */}
        {/* Form submission is handled by button click instead of form onSubmit */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <Input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="First name"
              disabled={isLoading}
              className={validationErrors.first_name ? 'error' : ''}
            />
            {validationErrors.first_name && (
              <span className="error-text">{validationErrors.first_name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <Input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Last name"
              disabled={isLoading}
              className={validationErrors.last_name ? 'error' : ''}
            />
            {validationErrors.last_name && (
              <span className="error-text">{validationErrors.last_name}</span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className={validationErrors.email ? 'error' : ''}
          />
          {validationErrors.email && (
            <span className="error-text">{validationErrors.email}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Create a password"
            disabled={isLoading}
            className={validationErrors.password ? 'error' : ''}
          />
          {validationErrors.password && (
            <span className="error-text">{validationErrors.password}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
            disabled={isLoading}
            className={validationErrors.confirmPassword ? 'error' : ''}
          />
          {validationErrors.confirmPassword && (
            <span className="error-text">{validationErrors.confirmPassword}</span>
          )}
        </div>

        {error && (
          <div className="auth-error">
            <span className="error-text">{error}</span>
          </div>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="auth-submit-button"
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Create Account'}
        </Button>

        <div className="auth-switch">
          <span>Already have an account? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-link"
            disabled={isLoading}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export { LoginForm, RegisterForm };