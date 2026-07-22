import express from 'express';
import * as barcodeController from '../controllers/barcodeController.js';
import { validateBarcodeGen } from '../validators/barcodeValidator.js';
import { barcodeLogger } from '../middleware/barcodeMiddleware.js';

const router = express.Router();

router.use(barcodeLogger);

router.post('/generate', validateBarcodeGen, barcodeController.generateBarcode);
router.get('/templates', barcodeController.getBarcodeTemplates);
router.delete('/templates/:id', barcodeController.deleteBarcodeTemplate);

export default router;
