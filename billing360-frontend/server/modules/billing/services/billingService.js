import { BillingModel } from '../models/billingModel.js';

export const fetchInvoices = async (branchId) => {
  return await BillingModel.findByBranch(branchId);
};

export const fetchInvoiceById = async (branchId, id) => {
  return await BillingModel.findById(branchId, id);
};

export const createNewInvoice = async (invoiceData) => {
  // Business logic: recalculate or check totals if not already calculated
  const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let totalTax = 0;
  
  if (invoiceData.isGst) {
    totalTax = invoiceData.items.reduce((sum, item) => {
      const taxRate = item.gstPercent || 0;
      return sum + ((item.price * taxRate / 100) * item.quantity);
    }, 0);
  }

  const discount = invoiceData.discount || 0;
  const computedTotal = subtotal + totalTax - discount;

  const enrichedData = {
    ...invoiceData,
    subtotal: invoiceData.subtotal || subtotal,
    totalTax: invoiceData.totalTax || totalTax,
    totalAmount: invoiceData.totalAmount || computedTotal
  };

  return await BillingModel.insert(enrichedData);
};

export const bulkSyncInvoices = async (invoices) => {
  return await BillingModel.insertBulk(invoices);
};

export const removeInvoice = async (branchId, id) => {
  return await BillingModel.delete(branchId, id);
};
