import express from 'express';
import authRoutes from './authRoutes.js';
import billingRoutes from './billingRoutes.js';
import gstRoutes from './gstRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, addCategory, deleteCategory } from '../controllers/productController.js';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../controllers/customerController.js';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { getVouchers, addVoucher, getLedgers, addLedger, updateLedger, deleteLedger } from '../controllers/voucherController.js';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController.js';
import { getBranches, addBranch, updateBranch } from '../controllers/branchController.js';
import { getPurchases, addPurchase, updatePurchase, deletePurchase } from '../controllers/purchaseController.js';
import { getSettings, saveSettings } from '../controllers/settingsController.js';
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

// Dashboard summary
router.get('/dashboard/summary', authenticateToken, getDashboardSummary);

// Products & Categories
router.get('/products', getProducts);
router.post('/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.delete('/categories/:id', deleteCategory);

// Customers
router.get('/customers', getCustomers);
router.post('/customers', addCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', addSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Vouchers & Ledgers
router.get('/vouchers', getVouchers);
router.post('/vouchers', addVoucher);
router.get('/ledgers', getLedgers);
router.post('/ledgers', addLedger);
router.put('/ledgers/:id', updateLedger);
router.delete('/ledgers/:id', deleteLedger);

// Purchases
router.get('/purchases', getPurchases);
router.post('/purchases', addPurchase);
router.put('/purchases/:id', updatePurchase);
router.delete('/purchases/:id', deletePurchase);

// Settings
router.get('/settings', getSettings);
router.post('/settings', saveSettings);
router.put('/settings', saveSettings);

// Employees
router.get('/employees', getEmployees);
router.post('/employees', addEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Branches
router.get('/branches', getBranches);
router.post('/branches', addBranch);
router.put('/branches/:id', updateBranch);

export default router;
