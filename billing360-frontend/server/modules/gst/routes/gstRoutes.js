import express from 'express';
import * as gstController from '../controllers/gstController.js';
import { validateGstReport } from '../validators/gstValidator.js';
import { gstLogger } from '../middleware/gstMiddleware.js';

const router = express.Router();

router.use(gstLogger);

router.get('/gstr1_check', validateGstReport, gstController.getGstr1Report);
router.get('/gstr3b_check', validateGstReport, gstController.getGstr3bReport);

export default router;
