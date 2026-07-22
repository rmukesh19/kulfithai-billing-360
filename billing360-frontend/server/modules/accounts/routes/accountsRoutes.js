import express from 'express';
import * as accountsController from '../controllers/accountsController.js';
import { validateTransaction } from '../validators/accountsValidator.js';
import { accountsLogger } from '../middleware/accountsMiddleware.js';

const router = express.Router();

router.use(accountsLogger);

router.get('/transactions', accountsController.getTransactions);
router.post('/transactions', validateTransaction, accountsController.createTransaction);
router.delete('/transactions/:id', accountsController.deleteTransaction);
router.get('/balance-sheet', accountsController.getBalanceSheet);

export default router;
