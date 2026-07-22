import express from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';
import configRoutes from './configRoutes.js';
import productRoutes from './productRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import geminiRoutes from './geminiRoutes.js';
import customerRoutes from './customerRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import reportRoutes from './reportRoutes.js';

// Enterprise Modules
import billingRoutes from '../modules/billing/routes/billingRoutes.js';
import productsRoutes from '../modules/products/routes/productsRoutes.js';
import barcodeRoutes from '../modules/barcode/routes/barcodeRoutes.js';
import gstRoutes from '../modules/gst/routes/gstRoutes.js';
import accountsRoutes from '../modules/accounts/routes/accountsRoutes.js';
import importsRoutes from '../modules/imports/routes/importsRoutes.js';

import { authMiddleware, loadCompanySettings } from '../middleware/auth.js';

const router = express.Router();

// Apply global company settings loader middleware
router.use(loadCompanySettings);

// Public routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected routes (Secure Backend APIs)
router.use('/config', authMiddleware, configRoutes);
router.use('/products', authMiddleware, productRoutes);
router.use('/invoices', authMiddleware, invoiceRoutes);
router.use('/insights', authMiddleware, geminiRoutes);
router.use('/customers', authMiddleware, customerRoutes);
router.use('/suppliers', authMiddleware, supplierRoutes);
router.use('/reports', authMiddleware, reportRoutes);

// Modular Routes
router.use('/modular/billing', authMiddleware, billingRoutes);
router.use('/modular/products', authMiddleware, productsRoutes);
router.use('/modular/barcode', authMiddleware, barcodeRoutes);
router.use('/modular/gst', authMiddleware, gstRoutes);
router.use('/modular/accounts', authMiddleware, accountsRoutes);
router.use('/modular/imports', authMiddleware, importsRoutes);

export default router;
