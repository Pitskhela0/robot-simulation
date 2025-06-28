// src/services/authService.ts
import apiClient from './apiClient';
import { User, RegisterData } from '../context/AuthContext';

// Types for API responses
interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshTokenResponse {
  accessToken: string;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REMEMBER_ME_KEY = 'remember_me';

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.initializeTokens();
    this.setupInterceptors();
  }

  // Initialize tokens from storage on service creation
  private initializeTokens() {
    this.accessToken = this.getStoredToken(ACCESS_TOKEN_KEY);
    this.refreshToken = this.getStoredToken(REFRESH_TOKEN_KEY);
  }

  // Setup axios interceptors for automatic token handling
  private setupInterceptors() {
    // Request interceptor to add auth header
    apiClient.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshTokenValue = this.getRefreshToken();
            if (refreshTokenValue) {
              const response = await this.refreshToken(refreshTokenValue);
              this.setAccessToken(response.accessToken);
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
              return apiClient(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Storage helpers
  private getStoredToken(key: string): string | null {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    
    if (rememberMe) {
      return localStorage.getItem(key);
    } else {
      return sessionStorage.getItem(key);
    }
  }

  private setStoredToken(key: string, value: string, persistent = false) {
    if (persistent) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  }

  private removeStoredToken(key: string) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  // Token management
  setTokens(accessToken: string, refreshToken: string, rememberMe = false) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    // Store remember me preference
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
    
    this.setStoredToken(ACCESS_TOKEN_KEY, accessToken, rememberMe);
    this.setStoredToken(REFRESH_TOKEN_KEY, refreshToken, rememberMe);
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    this.setStoredToken(ACCESS_TOKEN_KEY, accessToken, rememberMe);
  }

  getAccessToken(): string | null {
    return this.accessToken || this.getStoredToken(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.refreshToken || this.getStoredToken(REFRESH_TOKEN_KEY);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    
    this.removeStoredToken(ACCESS_TOKEN_KEY);
    this.removeStoredToken(REFRESH_TOKEN_KEY);
    this.removeStoredToken(REMEMBER_ME_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // API calls
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      throw new Error(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
    }
  }

  async register(userData: RegisterData): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('Email already registered');
      }
      
      if (error.response?.status === 400) {
        const validationErrors = error.response.data?.errors || [];
        throw new Error(
          validationErrors.length > 0 
            ? validationErrors.map((err: any) => err.msg).join(', ')
            : 'Registration failed. Please check your information.'
        );
      }

      throw new Error(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
      });

      return response.data.data;
    } catch (error: any) {
      throw new Error('Session expired. Please login again.');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {
        refreshToken,
      });
    } catch (error) {
      // Logout errors are not critical
      console.error('Logout error:', error);
    }
  }

  async getProfile(): Promise<User> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.data.user;
    } catch (error: any) {
      throw new Error('Failed to fetch user profile');
    }
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put('/auth/profile', userData);
      return response.data.data.user;
    } catch (error: any) {
      if (error.response?.status === 400) {
        const validationErrors = error.response.data?.errors || [];
        throw new Error(
          validationErrors.length > 0 
            ? validationErrors.map((err: any) => err.msg).join(', ')
            : 'Failed to update profile'
        );
      }

      throw new Error(
        error.response?.data?.message || 'Failed to update profile'
      );
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to send password reset email'
      );
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password,
      });
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired reset token');
      }

      throw new Error(
        error.response?.data?.message || 'Failed to reset password'
      );
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await apiClient.post('/auth/verify-email', { token });
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid or expired verification token');
      }

      throw new Error(
        error.response?.data?.message || 'Email verification failed'
      );
    }
  }

  async resendVerificationEmail(): Promise<void> {
    try {
      await apiClient.post('/auth/resend-verification');
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 'Failed to resend verification email'
      );
    }
  }
}

// Export singleton instance
export const authService = new AuthService();