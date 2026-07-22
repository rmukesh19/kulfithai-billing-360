import * as billingService from '../services/billingService.js';

export const getInvoices = async (req, res) => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId is required as query parameter'
      });
    }

    const invoices = await billingService.fetchInvoices(branchId);
    return res.status(200).json({
      success: true,
      data: invoices
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId is required'
      });
    }

    const invoice = await billingService.fetchInvoiceById(branchId, id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: `Invoice with ID ${id} not found`
      });
    }

    return res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    const createdInvoice = await billingService.createNewInvoice(invoiceData);
    return res.status(201).json({
      success: true,
      data: createdInvoice
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const syncInvoices = async (req, res) => {
  try {
    const { invoices } = req.body;
    if (!Array.isArray(invoices)) {
      return res.status(400).json({
        success: false,
        error: 'invoices array is required for synchronization'
      });
    }

    const synced = await billingService.bulkSyncInvoices(invoices);
    return res.status(200).json({
      success: true,
      syncedCount: synced.length,
      data: synced
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Invoice ID is required for deletion'
      });
    }

    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'branchId is required'
      });
    }

    const deleted = await billingService.removeInvoice(branchId, id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Invoice '${id}' not found`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Invoice soft deleted successfully',
      data: deleted
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
