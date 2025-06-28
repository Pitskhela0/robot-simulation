// backend/src/routes/auth.ts
import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile
} from '../controllers/authController';
import {
  registerValidation,
  loginValidation,
  refreshValidation,
  updateProfileValidation
} from '../validation/authValidation';
import { authenticate } from '../middleware/auth';
import { loginRateLimit, registerRateLimit } from '../middleware/rateLimiting';

const router = Router();

router.post('/register', registerRateLimit, registerValidation, register);
router.post('/login', loginRateLimit, loginValidation, login);
router.post('/refresh', refreshValidation, refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);

export default router;