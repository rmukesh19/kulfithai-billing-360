import express from 'express';
import * as billingController from '../controllers/billingController.js';
import { validateInvoice } from '../validators/billingValidator.js';
import { billingLogger } from '../middleware/billingMiddleware.js';

const router = express.Router();

router.use(billingLogger);

router.get('/', billingController.getInvoices);
router.get('/:id', billingController.getInvoiceById);
router.post('/', validateInvoice, billingController.createInvoice);
router.post('/sync', billingController.syncInvoices);
router.delete('/:id', billingController.deleteInvoice);

export default router;
