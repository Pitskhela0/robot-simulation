// src/components/Auth/ForgotPasswordForm.tsx
import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { validateEmail } from '../../utils/validation';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import './AuthForms.css';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateForm = () => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setValidationError(emailValidation.errors[0]);
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleInputChange = (value: string) => {
    setEmail(value);
    if (validationError) {
      setValidationError('');
    }
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <div className="auth-form-header">
          <div className="success-icon">✉️</div>
          <h2>Check Your Email</h2>
          <p>We've sent a password reset link to {email}</p>
        </div>

        <div className="auth-form-content">
          <div className="success-message">
            <p>If an account with that email exists, you'll receive a password reset link shortly.</p>
            <p>The link will expire in 1 hour for security reasons.</p>
          </div>

          <div className="auth-links">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="auth-link"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>Forgot Password?</h2>
        <p>Enter your email and we'll send you a reset link</p>
      </div>

      <div className="auth-form-content">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            className={validationError ? 'error' : ''}
          />
          {validationError && (
            <span className="error-text">{validationError}</span>
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
          disabled={isLoading || !email}
          className="auth-submit-button"
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Send Reset Link'}
        </Button>

        <div className="auth-links">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-link"
            disabled={isLoading}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

// src/components/Auth/ResetPasswordForm.tsx
interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  token,
  onSuccess,
  onSwitchToLogin,
}) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
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

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword(token, formData.password);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-form">
        <div className="auth-form-header">
          <div className="success-icon">✅</div>
          <h2>Password Reset Successful</h2>
          <p>Your password has been successfully updated</p>
        </div>

        <div className="auth-form-content">
          <div className="success-message">
            <p>You can now sign in with your new password.</p>
          </div>

          <Button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-submit-button"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <h2>Reset Your Password</h2>
        <p>Enter your new password below</p>
      </div>

      <div className="auth-form-content">
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter new password"
            disabled={isLoading}
            className={validationErrors.password ? 'error' : ''}
          />
          {validationErrors.password && (
            <span className="error-text">{validationErrors.password}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm new password"
            disabled={isLoading}
            className={validationErrors.confirmPassword ? 'error' : ''}
          />
          {validationErrors.confirmPassword && (
            <span className="error-text">{validationErrors.confirmPassword}</span>
          )}
        </div>

        <div className="password-requirements">
          <p>Password must contain:</p>
          <ul>
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character (!@#$%^&*)</li>
          </ul>
        </div>

        {error && (
          <div className="auth-error">
            <span className="error-text">{error}</span>
          </div>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !formData.password || !formData.confirmPassword}
          className="auth-submit-button"
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Reset Password'}
        </Button>

        <div className="auth-links">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-link"
            disabled={isLoading}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export { ForgotPasswordForm, ResetPasswordForm };