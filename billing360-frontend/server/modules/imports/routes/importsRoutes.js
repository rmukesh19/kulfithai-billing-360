import express from 'express';
import * as importsController from '../controllers/importsController.js';
import { validateBulkImport, validateRollback } from '../validators/importsValidator.js';
import { importsLogger } from '../middleware/importsMiddleware.js';

const router = express.Router();

router.use(importsLogger);

router.post('/process', validateBulkImport, importsController.importData);
router.get('/history', importsController.getImportLogs);
router.post('/rollback', validateRollback, importsController.rollbackImport);
router.delete('/:id', importsController.deleteLog);

export default router;
