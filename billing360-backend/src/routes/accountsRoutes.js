import express from 'express';
import { getVouchers, addVoucher, deleteVoucher, getLedgers, getTrialBalance } from '../controllers/accountsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Vouchers
router.get('/vouchers', getVouchers);
router.post('/vouchers', addVoucher);
router.delete('/vouchers/:id', deleteVoucher);

// Ledgers
router.get('/ledgers', getLedgers);
router.get('/trial-balance', getTrialBalance);

export default router;
