// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { User, CreateUserData } from '../models/User';
import { JWTManager } from '../utils/jwt';
import { validatePassword } from '../utils/password';
import { pool } from '../db';

const userModel = new User(pool);
const jwtManager = new JWTManager(pool);

const sendResponse = (res: Response, statusCode: number, response: any) => {
  res.status(statusCode).json(response);
};

const handleValidationErrors = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendResponse(res, 400, {
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return true;
  }
  return false;
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { email, password, first_name, last_name } = req.body;

    // Check if user exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      sendResponse(res, 409, {
        success: false,
        message: 'Email already registered'
      });
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      sendResponse(res, 400, {
        success: false,
        message: 'Password requirements not met',
        errors: passwordValidation.errors
      });
      return;
    }

    // Create user
    const userData: CreateUserData = { email, password, first_name, last_name };
    const newUser = await userModel.create(userData);

    // Generate tokens
    const accessToken = jwtManager.generateAccessToken({
      userId: newUser.id!,
      email: newUser.email,
      role: newUser.role!
    });

    const refreshToken = jwtManager.generateRefreshToken(newUser.id!);
    await jwtManager.storeRefreshToken(newUser.id!, refreshToken);

    sendResponse(res, 201, {
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          role: newUser.role
        },
        accessToken,
        refreshToken
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Registration failed'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { email, password } = req.body;

    // Verify credentials
    const user = await userModel.verifyPassword(email, password);
    
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Generate tokens
    const accessToken = jwtManager.generateAccessToken({
      userId: user.id!,
      email: user.email,
      role: user.role!
    });

    const refreshToken = jwtManager.generateRefreshToken(user.id!);
    await jwtManager.storeRefreshToken(user.id!, refreshToken);

    // Update last login
    await userModel.updateLastLogin(user.id!);

    sendResponse(res, 200, {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        accessToken,
        refreshToken
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Login failed'
    });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendResponse(res, 400, {
        success: false,
        message: 'Refresh token required'
      });
      return;
    }

    // Validate refresh token
    const userId = await jwtManager.validateRefreshToken(refreshToken);
    
    if (!userId) {
      sendResponse(res, 401, {
        success: false,
        message: 'Invalid refresh token'
      });
      return;
    }

    const user = await userModel.findById(userId);
    if (!user) {
      sendResponse(res, 401, {
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate new access token
    const accessToken = jwtManager.generateAccessToken({
      userId: user.id!,
      email: user.email,
      role: user.role!
    });

    sendResponse(res, 200, {
      success: true,
      data: { accessToken },
      message: 'Token refreshed'
    });

  } catch (error) {
    console.error('Refresh error:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Token refresh failed'
    });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await jwtManager.removeRefreshToken(refreshToken);
    }

    sendResponse(res, 200, {
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Logout failed'
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    sendResponse(res, 200, {
      success: true,
      data: {
        user: {
          id: user!.id,
          email: user!.email,
          first_name: user!.first_name,
          last_name: user!.last_name,
          role: user!.role,
          created_at: user!.created_at,
          last_login: user!.last_login
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Failed to get profile'
    });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (handleValidationErrors(req, res)) return;

    const { first_name, last_name } = req.body;
    const userId = req.user!.id!;

    await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3',
      [first_name, last_name, userId]
    );

    const updatedUser = await userModel.findById(userId);

    sendResponse(res, 200, {
      success: true,
      data: {
        user: {
          id: updatedUser!.id,
          email: updatedUser!.email,
          first_name: updatedUser!.first_name,
          last_name: updatedUser!.last_name,
          role: updatedUser!.role
        }
      },
      message: 'Profile updated'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Update failed'
    });
  }
};