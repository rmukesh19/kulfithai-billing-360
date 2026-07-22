import express from 'express';
import * as productsController from '../controllers/productsController.js';
import { validateProduct } from '../validators/productsValidator.js';
import { productsLogger } from '../middleware/productsMiddleware.js';

const router = express.Router();

router.use(productsLogger);

router.get('/', productsController.getProducts);
router.post('/', validateProduct, productsController.createProduct);
router.delete('/:id', productsController.deleteProduct);

export default router;
