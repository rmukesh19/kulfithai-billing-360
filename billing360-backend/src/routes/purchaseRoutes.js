import express from 'express';
import { createPurchase, getPurchases, deletePurchase, updateOrderStatus } from '../controllers/purchaseController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', getPurchases);
router.post('/', createPurchase);
router.delete('/:id', deletePurchase);
router.put('/:id/order-status', updateOrderStatus);

export default router;
