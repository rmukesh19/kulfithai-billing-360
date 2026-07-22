import express from 'express';
import { getGSTR1, getGSTR2, getGSTR3B, getHsnSummary } from '../controllers/gstController.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// GST Reports are highly sensitive and should require Admin structural role privileges
router.use(requireRoles(['SuperAdmin', 'Admin', 'Manager']));

router.get('/gstr1', getGSTR1);
router.get('/gstr2', getGSTR2);
router.get('/gstr3b', getGSTR3B);
router.get('/hsn-summary', getHsnSummary);

export default router;
