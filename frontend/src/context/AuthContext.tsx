// src/context/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

// Types
export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; accessToken: string } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    
    default:
      return state;
  }
};

// Context interface
interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = authService.getAccessToken();
      
      if (token) {
        // Verify token is still valid by getting user profile
        const user = await authService.getProfile();
        dispatch({ 
          type: 'SET_USER', 
          payload: { user, accessToken: token } 
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      // Token might be expired, try to refresh
      const refreshed = await refreshToken();
      if (!refreshed) {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const result = await authService.login(email, password);
      
      // Store tokens
      authService.setTokens(result.accessToken, result.refreshToken, rememberMe);
      
      dispatch({ 
        type: 'SET_USER', 
        payload: { 
          user: result.user, 
          accessToken: result.accessToken 
        } 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const result = await authService.register(userData);
      
      // Auto-login after successful registration
      authService.setTokens(result.accessToken, result.refreshToken, false);
      
      dispatch({ 
        type: 'SET_USER', 
        payload: { 
          user: result.user, 
          accessToken: result.accessToken 
        } 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = authService.getRefreshToken();
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authService.clearTokens();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      const updatedUser = await authService.updateProfile(userData);
      
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenValue = authService.getRefreshToken();
      
      if (!refreshTokenValue) {
        return false;
      }
      
      const result = await authService.refreshToken(refreshTokenValue);
      
      // Update access token
      authService.setAccessToken(result.accessToken);
      
      dispatch({ 
        type: 'SET_USER', 
        payload: { 
          user: state.user!, 
          accessToken: result.accessToken 
        } 
      });
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};