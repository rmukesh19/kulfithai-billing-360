import express from 'express';
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories, addCategory, deleteCategory } from '../controllers/productController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Products
router.get('/', getProducts);
router.post('/', addProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Categories
router.get('/categories', getCategories);
router.post('/categories', addCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
