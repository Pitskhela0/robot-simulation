// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { JWTManager, JWTPayload } from '../utils/jwt';
import { User, UserData } from '../models/User';
import { pool } from '../db';
import { UserRole, userRoles } from '../config/auth';

declare global {
  namespace Express {
    interface Request {
      user?: UserData;
    }
  }
}

const jwtManager = new JWTManager(pool);
const userModel = new User(pool);

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwtManager.verifyToken(token);
    const user = await userModel.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== userRoles.ADMIN) {
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
    return;
  }

  next();
};