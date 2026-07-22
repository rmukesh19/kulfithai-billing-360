import * as accountsService from '../services/accountsService.js';

export const getTransactions = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId is required'
      });
    }

    const tx = await accountsService.fetchTransactions(branchId);
    return res.status(200).json({
      success: true,
      data: tx
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const txData = req.body;
    const createdTx = await accountsService.createNewTransaction(txData);
    return res.status(201).json({
      success: true,
      data: createdTx
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required'
      });
    }

    const deleted = await accountsService.removeTransaction(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Transaction with ID '${id}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction soft deleted successfully',
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getBalanceSheet = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId is required'
      });
    }

    const sheet = await accountsService.calculateBalanceSheet(branchId);
    return res.status(200).json({
      success: true,
      data: sheet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
