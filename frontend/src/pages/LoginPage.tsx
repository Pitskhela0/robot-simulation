// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { LoginForm, RegisterForm } from '../components/Auth/LoginForm';
import { ForgotPasswordForm } from '../components/Auth/ForgotPasswordForm';
import AuthGuard from '../components/Auth/AuthGuard';
import './AuthPages.css';

type AuthMode = 'login' | 'register' | 'forgot-password';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  const handleAuthSuccess = () => {
    // Redirect to dashboard or previous page
    window.location.href = '/dashboard';
  };

  const renderAuthForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setMode('register')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
          />
        );
      case 'register':
        return (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onSuccess={() => setMode('login')}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthGuard requireAuth={false} redirectTo="/dashboard">
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-brand">
            <h1>Robot Task Simulator</h1>
            <p>Manage and simulate robot operations</p>
          </div>
          <div className="auth-form-container">
            {renderAuthForm()}
          </div>
        </div>
        <div className="auth-background">
          <div className="auth-pattern"></div>
        </div>
      </div>
    </AuthGuard>
  );
};

// src/pages/ResetPasswordPage.tsx
import { ResetPasswordForm } from '../components/Auth/ForgotPasswordForm';

interface ResetPasswordPageProps {
  token: string;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token }) => {
  const handleResetSuccess = () => {
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-brand">
            <h1>Robot Task Simulator</h1>
            <p>Reset your password to continue</p>
          </div>
          <div className="auth-form-container">
            <ResetPasswordForm
              token={token}
              onSuccess={handleResetSuccess}
              onSwitchToLogin={() => window.location.href = '/login'}
            />
          </div>
        </div>
        <div className="auth-background">
          <div className="auth-pattern"></div>
        </div>
      </div>
    </AuthGuard>
  );
};

// src/pages/ProfilePage.tsx
import UserProfile from '../components/Auth/UserProfile';
import Layout from '../components/Layout/Layout';

const ProfilePage: React.FC = () => {
  return (
    <AuthGuard>
      <Layout>
        <div className="profile-page">
          <div className="page-header">
            <h1>User Profile</h1>
            <p>Manage your account settings and personal information</p>
          </div>
          <div className="page-content">
            <UserProfile />
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
};

// src/pages/EmailVerificationPage.tsx
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Button from '../components/UI/Button';

interface EmailVerificationPageProps {
  token?: string;
}

const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ token }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setIsLoading(false);
      setError('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      await authService.verifyEmail(verificationToken);
      setIsSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Email verification failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setError('');

    try {
      await authService.resendVerificationEmail();
      setError('Verification email sent! Please check your inbox.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification email';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="verification-content">
            <LoadingSpinner message="Verifying your email..." />
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="verification-content success">
            <div className="success-icon">✅</div>
            <h2>Email Verified Successfully!</h2>
            <p>Your email has been verified. You can now access all features.</p>
            <Button
              onClick={() => window.location.href = '/login'}
              className="auth-submit-button"
            >
              Continue to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="verification-content error">
          <div className="error-icon">❌</div>
          <h2>Email Verification Failed</h2>
          <p className="error-text">{error}</p>
          
          <div className="verification-actions">
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              className="auth-submit-button secondary"
            >
              {isResending ? <LoadingSpinner size="small" /> : 'Resend Verification Email'}
            </Button>
            
            <Button
              onClick={() => window.location.href = '/login'}
              className="auth-submit-button"
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// src/pages/DashboardPage.tsx
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout/Layout';
import { AuthenticatedUser } from '../components/Auth/AuthGuard';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <Layout>
        <div className="dashboard-page">
          <div className="dashboard-header">
            <div className="welcome-section">
              <h1>Welcome back, {user?.first_name}!</h1>
              <p>Manage your robot simulations and tasks</p>
            </div>
            <AuthenticatedUser />
          </div>
          
          <div className="dashboard-content">
            <div className="dashboard-cards">
              <div className="dashboard-card">
                <h3>🤖 Simulations</h3>
                <p>Create and manage robot simulations</p>
                <Button onClick={() => window.location.href = '/simulations'}>
                  View Simulations
                </Button>
              </div>
              
              <div className="dashboard-card">
                <h3>📊 Analytics</h3>
                <p>View performance metrics and reports</p>
                <Button disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="dashboard-card">
                <h3>⚙️ Settings</h3>
                <p>Configure your account and preferences</p>
                <Button onClick={() => window.location.href = '/profile'}>
                  Account Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
};

export { LoginPage, ResetPasswordPage, ProfilePage, EmailVerificationPage, DashboardPage };