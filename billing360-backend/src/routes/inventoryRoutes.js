import express from 'express';
import { getStockList, updateStockQty, transferStock } from '../controllers/inventoryController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/stock-list', getStockList);

// Changing quantities/adjusting stock levels requires Manager/Admin authorization levels
router.post('/adjust', requireRoles(['SuperAdmin', 'Admin', 'Manager']), updateStockQty);
router.post('/transfer', requireRoles(['SuperAdmin', 'Admin', 'Manager']), transferStock);

export default router;
