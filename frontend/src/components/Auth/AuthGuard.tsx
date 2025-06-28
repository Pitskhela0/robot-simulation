// src/components/Auth/AuthGuard.tsx
import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import LoginForm from './LoginForm';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
  redirectTo,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="auth-guard-loading">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default fallback - show login form
    return (
      <div className="auth-guard-login">
        <div className="auth-required-message">
          <h3>Authentication Required</h3>
          <p>Please sign in to access this feature.</p>
        </div>
        <LoginForm onSuccess={() => window.location.reload()} />
      </div>
    );
  }

  // If authentication is NOT required but user IS authenticated
  // (useful for login/register pages)
  if (!requireAuth && isAuthenticated && redirectTo) {
    window.location.href = redirectTo;
    return (
      <div className="auth-guard-loading">
        <LoadingSpinner message="Redirecting..." />
      </div>
    );
  }

  // User meets the authentication requirements
  return <>{children}</>;
};

// Higher-order component for protecting routes
export const withAuthGuard = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) => {
  return (props: P) => (
    <AuthGuard {...options}>
      <Component {...props} />
    </AuthGuard>
  );
};

// Role-based access control component
interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  fallback?: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking permissions..." />;
  }

  if (!isAuthenticated || !user) {
    return (
      <AuthGuard>
        {children}
      </AuthGuard>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="role-guard-denied">
        <div className="access-denied-message">
          <h3>Access Denied</h3>
          <p>You don't have permission to access this feature.</p>
          <p>Required role: {allowedRoles.join(' or ')}</p>
          <p>Your role: {user.role}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Component for authenticated user information
export const AuthenticatedUser: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  return (
    <div className="authenticated-user">
      <div className="user-info">
        <div className="user-avatar">
          {user.first_name?.[0]}{user.last_name?.[0]}
        </div>
        <div className="user-details">
          <span className="user-name">{user.first_name} {user.last_name}</span>
          <span className="user-email">{user.email}</span>
        </div>
      </div>
      <div className="user-actions">
        <button
          onClick={() => window.location.href = '/profile'}
          className="user-action-btn"
          disabled={isLoading}
        >
          Profile
        </button>
        <button
          onClick={handleLogout}
          className="user-action-btn logout-btn"
          disabled={isLoading}
        >
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
};

// Protected simulation context wrapper
export const ProtectedSimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthGuard>
      {children}
    </AuthGuard>
  );
};

export default AuthGuard;