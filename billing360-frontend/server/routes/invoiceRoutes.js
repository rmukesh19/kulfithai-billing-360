import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/', invoiceController.getInvoices);
router.post('/sync', invoiceController.syncInvoices);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;
