import express from 'express';
import { login, register, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes for user operations
router.post('/login', login);
router.post('/register', register);

// Restricted route to verify token validation
router.get('/profile', authenticateToken, getProfile);

export default router;
