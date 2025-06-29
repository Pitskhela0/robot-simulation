// src/components/Simulation/SimulationSharingModal.tsx
import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { PermissionLevel, SimulationPermissions } from '../../types/simulation';
import { validateEmail } from '../../utils/validation';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Select from '../UI/Select';
import LoadingSpinner from '../UI/LoadingSpinner';
import './SimulationSharing.css';

interface SimulationSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimulationSharingModal: React.FC<SimulationSharingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    simulation, 
    shareSimulationWithUser, 
    updateUserPermissions, 
    removeUserFromSimulation,
    makePublic,
    makePrivate,
    permissions,
    isLoading,
    error,
    setError 
  } = useSimulation();

  const [shareForm, setShareForm] = useState({
    email: '',
    permission_level: PermissionLevel.READ,
    message: ''
  });
  const [validationError, setValidationError] = useState('');

  if (!isOpen || !simulation) return null;

  const handleShareFormChange = (field: string, value: string) => {
    setShareForm(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError('');
    if (error) setError(null);
  };

  const handleShareSubmit = async () => {
    // Validate email
    const emailValidation = validateEmail(shareForm.email);
    if (!emailValidation.isValid) {
      setValidationError(emailValidation.errors[0]);
      return;
    }

    // Check if already shared with this user
    const existingShare = simulation.shared_with.find(
      user => user.email.toLowerCase() === shareForm.email.toLowerCase()
    );
    
    if (existingShare) {
      setValidationError('This simulation is already shared with this user');
      return;
    }

    const success = await shareSimulationWithUser(shareForm);
    if (success) {
      setShareForm({ email: '', permission_level: PermissionLevel.READ, message: '' });
      setValidationError('');
    }
  };

  const handlePermissionChange = async (userId: number, newLevel: PermissionLevel) => {
    await updateUserPermissions(userId, newLevel);
  };

  const handleRemoveUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to remove this user\'s access?')) {
      await removeUserFromSimulation(userId);
    }
  };

  const handleTogglePublic = async () => {
    if (simulation.is_public) {
      await makePrivate();
    } else {
      await makePublic();
    }
  };

  const permissionOptions = [
    { value: PermissionLevel.READ, label: SimulationPermissions.getPermissionDisplayName(PermissionLevel.READ) },
    { value: PermissionLevel.WRITE, label: SimulationPermissions.getPermissionDisplayName(PermissionLevel.WRITE) },
    { value: PermissionLevel.ADMIN, label: SimulationPermissions.getPermissionDisplayName(PermissionLevel.ADMIN) },
  ];

  return (
    <div className="sharing-modal-overlay" onClick={onClose}>
      <div className="sharing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sharing-modal-header">
          <h3>Share Simulation</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="sharing-modal-content">
          {/* Public/Private Toggle */}
          <div className="sharing-section">
            <h4>Visibility</h4>
            <div className="visibility-controls">
              <div className="visibility-option">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={simulation.is_public}
                    onChange={handleTogglePublic}
                    disabled={!permissions.canWrite || isLoading}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">
                    {simulation.is_public ? 'Public' : 'Private'}
                  </span>
                </label>
                <p className="visibility-description">
                  {simulation.is_public 
                    ? 'Anyone can view this simulation' 
                    : 'Only invited users can access this simulation'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Share with Users */}
          {permissions.canShare && (
            <div className="sharing-section">
              <h4>Invite Users</h4>
              
              <div className="share-form">
                <div className="form-group">
                  <Input
                    type="email"
                    value={shareForm.email}
                    onChange={(e) => handleShareFormChange('email', e.target.value)}
                    placeholder="Enter email address"
                    disabled={isLoading}
                    className={validationError ? 'error' : ''}
                  />
                  {validationError && (
                    <span className="error-text">{validationError}</span>
                  )}
                </div>

                <div className="form-group">
                  <Select
                    value={shareForm.permission_level}
                    onChange={(e) => handleShareFormChange('permission_level', e.target.value)}
                    options={permissionOptions}
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <textarea
                    value={shareForm.message}
                    onChange={(e) => handleShareFormChange('message', e.target.value)}
                    placeholder="Optional message..."
                    rows={3}
                    disabled={isLoading}
                    className="share-message"
                  />
                </div>

                <Button
                  onClick={handleShareSubmit}
                  disabled={!shareForm.email || isLoading}
                  className="share-button"
                >
                  {isLoading ? <LoadingSpinner size="small" /> : 'Send Invitation'}
                </Button>
              </div>
            </div>
          )}

          {/* Current Shares */}
          <div className="sharing-section">
            <h4>Current Access</h4>
            
            <div className="shared-users-list">
              {/* Owner */}
              <div className="shared-user-item owner">
                <div className="user-info">
                  <div className="user-avatar">
                    {simulation.owner.first_name?.[0]}{simulation.owner.last_name?.[0]}
                  </div>
                  <div className="user-details">
                    <span className="user-name">
                      {simulation.owner.first_name} {simulation.owner.last_name}
                    </span>
                    <span className="user-email">{simulation.owner.email}</span>
                  </div>
                </div>
                <div className="user-permission">
                  <span className="permission-badge owner">Owner</span>
                </div>
              </div>

              {/* Shared Users */}
              {simulation.shared_with.map((sharedUser) => (
                <div key={sharedUser.id} className="shared-user-item">
                  <div className="user-info">
                    <div className="user-avatar">
                      {sharedUser.first_name?.[0]}{sharedUser.last_name?.[0]}
                    </div>
                    <div className="user-details">
                      <span className="user-name">
                        {sharedUser.first_name} {sharedUser.last_name}
                      </span>
                      <span className="user-email">{sharedUser.email}</span>
                      <span className="shared-date">
                        Shared {new Date(sharedUser.shared_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="user-permission">
                    {permissions.canShare ? (
                      <Select
                        value={sharedUser.permission_level}
                        onChange={(e) => handlePermissionChange(sharedUser.id, e.target.value as PermissionLevel)}
                        options={permissionOptions}
                        disabled={isLoading}
                        className="permission-select"
                      />
                    ) : (
                      <span className={`permission-badge ${sharedUser.permission_level}`}>
                        {SimulationPermissions.getPermissionDisplayName(sharedUser.permission_level)}
                      </span>
                    )}
                    {permissions.canShare && (
                      <button
                        onClick={() => handleRemoveUser(sharedUser.id)}
                        className="remove-user-button"
                        disabled={isLoading}
                        title="Remove access"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {simulation.shared_with.length === 0 && (
                <div className="no-shared-users">
                  <p>No users have been invited to this simulation yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Copy Link Section */}
          <div className="sharing-section">
            <h4>Share Link</h4>
            <div className="share-link-container">
              <Input
                type="text"
                value={`${window.location.origin}/simulations/${simulation.id}`}
                readOnly
                className="share-link-input"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/simulations/${simulation.id}`);
                  // You could add a toast notification here
                }}
                className="copy-link-button"
              >
                Copy Link
              </Button>
            </div>
            <p className="share-link-note">
              {simulation.is_public 
                ? 'Anyone with this link can view the simulation'
                : 'Only users with access can use this link'
              }
            </p>
          </div>

          {error && (
            <div className="sharing-error">
              <span className="error-text">{error}</span>
            </div>
          )}
        </div>

        <div className="sharing-modal-footer">
          <Button onClick={onClose} className="secondary">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

// src/components/Simulation/SimulationPermissionBadge.tsx
interface SimulationPermissionBadgeProps {
  simulation: any;
  userId?: number;
  showFullText?: boolean;
}

const SimulationPermissionBadge: React.FC<SimulationPermissionBadgeProps> = ({
  simulation,
  userId,
  showFullText = false
}) => {
  if (!simulation) return null;

  const accessLevel = SimulationPermissions.getAccessLevel(simulation, userId);
  const displayName = SimulationPermissions.getAccessLevelDisplayName(accessLevel);

  return (
    <span className={`permission-badge ${accessLevel}`}>
      {showFullText ? displayName : displayName.split(' ')[0]}
    </span>
  );
};

// src/components/Simulation/SimulationAccessInfo.tsx
interface SimulationAccessInfoProps {
  simulation: any;
  userId?: number;
}

const SimulationAccessInfo: React.FC<SimulationAccessInfoProps> = ({
  simulation,
  userId
}) => {
  if (!simulation) return null;

  const permissions = {
    canRead: SimulationPermissions.canRead(simulation, userId),
    canWrite: SimulationPermissions.canWrite(simulation, userId),
    canDelete: SimulationPermissions.canDelete(simulation, userId),
    canShare: SimulationPermissions.canShare(simulation, userId),
    canExecute: SimulationPermissions.canExecute(simulation, userId),
  };

  return (
    <div className="simulation-access-info">
      <div className="access-summary">
        <SimulationPermissionBadge 
          simulation={simulation} 
          userId={userId} 
          showFullText 
        />
        {simulation.is_public && (
          <span className="public-badge">Public</span>
        )}
      </div>
      
      <div className="permission-details">
        <div className="permission-item">
          <span className={`permission-icon ${permissions.canRead ? 'allowed' : 'denied'}`}>👁️</span>
          <span>View</span>
        </div>
        <div className="permission-item">
          <span className={`permission-icon ${permissions.canWrite ? 'allowed' : 'denied'}`}>✏️</span>
          <span>Edit</span>
        </div>
        <div className="permission-item">
          <span className={`permission-icon ${permissions.canShare ? 'allowed' : 'denied'}`}>🔗</span>
          <span>Share</span>
        </div>
        <div className="permission-item">
          <span className={`permission-icon ${permissions.canExecute ? 'allowed' : 'denied'}`}>▶️</span>
          <span>Run</span>
        </div>
      </div>
    </div>
  );
};

export { SimulationSharingModal, SimulationPermissionBadge, SimulationAccessInfo };