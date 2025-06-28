// src/components/Auth/UserProfile.tsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';
import Button from '../UI/Button';
import Input from '../UI/Input';
import LoadingSpinner from '../UI/LoadingSpinner';
import './UserProfile.css';

const UserProfile: React.FC = () => {
  const { user, updateProfile, isLoading, error, clearError } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
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
    
    // Clear messages when user starts typing
    if (error) {
      clearError();
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form data
      setFormData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
      });
      setValidationErrors({});
      clearError();
      setSuccessMessage('');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateProfile(formData);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="user-profile">
        <div className="profile-error">
          <p>User information not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
        </div>
        <div className="profile-info">
          <h2>{user.first_name} {user.last_name}</h2>
          <p className="profile-email">{user.email}</p>
          <span className="profile-role">{user.role}</span>
        </div>
        <div className="profile-actions">
          <Button
            onClick={handleEditToggle}
            disabled={isLoading}
            className={isEditing ? 'secondary' : 'primary'}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      <div className="profile-content">
        {successMessage && (
          <div className="success-message">
            <span className="success-text">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="error-text">{error}</span>
          </div>
        )}

        <div className="profile-section">
          <h3>Personal Information</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              {isEditing ? (
                <Input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="First name"
                  disabled={isLoading}
                  className={validationErrors.first_name ? 'error' : ''}
                />
              ) : (
                <div className="profile-value">{user.first_name || 'Not set'}</div>
              )}
              {validationErrors.first_name && (
                <span className="error-text">{validationErrors.first_name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              {isEditing ? (
                <Input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Last name"
                  disabled={isLoading}
                  className={validationErrors.last_name ? 'error' : ''}
                />
              ) : (
                <div className="profile-value">{user.last_name || 'Not set'}</div>
              )}
              {validationErrors.last_name && (
                <span className="error-text">{validationErrors.last_name}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              {isEditing ? (
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Email address"
                  disabled={isLoading}
                  className={validationErrors.email ? 'error' : ''}
                />
              ) : (
                <div className="profile-value">{user.email}</div>
              )}
              {validationErrors.email && (
                <span className="error-text">{validationErrors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label>Role</label>
              <div className="profile-value">{user.role}</div>
            </div>
          </div>

          {isEditing && (
            <div className="profile-actions-edit">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="primary"
              >
                {isLoading ? <LoadingSpinner size="small" /> : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>Account Information</h3>
          
          <div className="info-grid">
            <div className="info-item">
              <label>Account Created</label>
              <div className="profile-value">{formatDate(user.created_at)}</div>
            </div>

            <div className="info-item">
              <label>Last Login</label>
              <div className="profile-value">{formatDate(user.last_login)}</div>
            </div>

            <div className="info-item">
              <label>User ID</label>
              <div className="profile-value">#{user.id}</div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Security</h3>
          
          <div className="security-actions">
            <Button
              onClick={() => {/* TODO: Implement change password */}}
              className="secondary"
              disabled
            >
              Change Password (Coming Soon)
            </Button>
            
            <Button
              onClick={() => {/* TODO: Implement 2FA */}}
              className="secondary"
              disabled
            >
              Enable Two-Factor Auth (Coming Soon)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;