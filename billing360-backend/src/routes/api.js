import express from 'express';
import authRoutes from './authRoutes.js';
import billingRoutes from './billingRoutes.js';
import gstRoutes from './gstRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public & restricted auth endpoints
router.use('/auth', authRoutes);

// Billing & POS checkout
router.use('/billing', billingRoutes);

// GSTR filing modules
router.use('/gst', gstRoutes);

// Stock & warehouse transfers
router.use('/inventory', inventoryRoutes);

// Dashboard summary dashboard endpoint
router.get('/dashboard/summary', authenticateToken, getDashboardSummary);

export default router;
