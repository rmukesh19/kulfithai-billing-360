import express from 'express';
import { createInvoice, getInvoices, generatePdfInvoice } from '../controllers/billingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes below

router.post('/create', createInvoice);
router.get('/list', getInvoices);
router.get('/:id/pdf', generatePdfInvoice);

export default router;
