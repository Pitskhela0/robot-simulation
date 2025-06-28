// src/components/Layout/Navigation.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthenticatedUser } from '../Auth/AuthGuard';
import Button from '../UI/Button';
import './Navigation.css';

const Navigation: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <nav className="navigation">
      <ul className="nav-list">
        <li className="nav-item">
          <a href="/" className="nav-link">
            Home
          </a>
        </li>
        
        {isAuthenticated && (
          <>
            <li className="nav-item">
              <a href="/dashboard" className="nav-link">
                Dashboard
              </a>
            </li>
            <li className="nav-item">
              <a href="/simulations" className="nav-link">
                Simulations
              </a>
            </li>
          </>
        )}
        
        <li className="nav-item">
          <a href="/about" className="nav-link">
            About
          </a>
        </li>
      </ul>
      
      <div className="nav-auth">
        {isAuthenticated ? (
          <AuthenticatedUser />
        ) : (
          <div className="nav-auth-buttons">
            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              className="nav-signin-btn"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;