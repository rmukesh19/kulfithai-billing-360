import express from 'express';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerLedger, getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../controllers/customerController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Customers
router.get('/customers', getCustomers);
router.post('/customers', addCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);
router.get('/customers/:id/ledger', getCustomerLedger);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

export default router;
