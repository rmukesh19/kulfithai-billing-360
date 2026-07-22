import express from 'express';
import * as configController from '../controllers/configController.js';

const router = express.Router();

router.get('/', configController.getConfig);
router.post('/', configController.saveConfig);

export default router;
