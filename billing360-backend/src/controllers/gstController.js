import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';
import { Voucher } from '../models/Voucher.js';

// 1. GSTR-1: Outward taxable supplies (POS sales)
export const getGSTR1 = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';
  let { startDate, endDate } = req.query;
  
  startDate = startDate ? new Date(startDate) : new Date('2026-04-01');
  endDate = endDate ? new Date(endDate) : new Date('2026-06-30');

  try {
    const b2bInvoicesAgg = await Invoice.aggregate([
      { $match: { branch_id: branchId, billing_date: { $gte: startDate, $lte: endDate }, customer_id: { $ne: null } } },
      { $lookup: { from: 'customers', localField: 'customer_id', foreignField: '_id', as: 'c' } },
      { $unwind: '$c' },
      { $match: { 'c.gstin': { $ne: null } } },
      { $group: {
          _id: '$c._id',
          customer_name: { $first: '$c.name' },
          gstin: { $first: '$c.gstin' },
          taxable_value: { $sum: '$subtotal' },
          cgst: { $sum: '$cgst_amount' },
          sgst: { $sum: '$sgst_amount' },
          igst: { $sum: '$igst_amount' },
          total: { $sum: '$total_amount' }
      } },
      { $project: { _id: 0 } }
    ]);

    const b2cInvoicesAgg = await Invoice.aggregate([
      { $match: { branch_id: branchId, billing_date: { $gte: startDate, $lte: endDate } } },
      { $lookup: { from: 'customers', localField: 'customer_id', foreignField: '_id', as: 'c' } },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      { $match: { $or: [{ 'c.gstin': null }, { 'c._id': { $exists: false } }] } },
      { $group: {
          _id: null,
          taxable_value: { $sum: '$subtotal' },
          cgst: { $sum: '$cgst_amount' },
          sgst: { $sum: '$sgst_amount' },
          igst: { $sum: '$igst_amount' },
          total: { $sum: '$total_amount' }
      } },
      { $project: { _id: 0 } }
    ]);

    return res.json({
      success: true,
      b2b: b2bInvoicesAgg,
      b2c: b2cInvoicesAgg,
      meta: { startDate, endDate }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'GSTR-1 generation failed', error: err.message });
  }
};

// 2. GSTR-2: Inward supplies (Purchases list)
export const getGSTR2 = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';
  let { startDate, endDate } = req.query;

  startDate = startDate ? new Date(startDate) : new Date('2026-04-01');
  endDate = endDate ? new Date(endDate) : new Date('2026-06-30');

  try {
    const suppliers = await Supplier.find({});
    
    const purchases = [];
    for (const supplier of suppliers) {
      const vouchers = await Voucher.find({
        branch_id: branchId,
        type: 'payment',
        date: { $gte: startDate, $lte: endDate },
        narration: { $regex: supplier.name, $options: 'i' }
      });
      
      if (vouchers.length > 0) {
        let taxable_value = 0;
        for (const v of vouchers) taxable_value += (v.total_amount || 0);
        
        purchases.push({
          supplier_name: supplier.name,
          gstin: supplier.gstin,
          taxable_value,
          cgst: taxable_value * 0.09,
          sgst: taxable_value * 0.09
        });
      }
    }

    return res.json({
      success: true,
      inwardSupplies: purchases
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'GSTR-2 matching aborted', error: err.message });
  }
};

// 3. GSTR-3B: Tax liability comparison vs offset matches
export const getGSTR3B = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';

  try {
    const outputTaxAgg = await Invoice.aggregate([
      { $match: { branch_id: branchId } },
      { $group: {
          _id: null,
          cgst: { $sum: '$cgst_amount' },
          sgst: { $sum: '$sgst_amount' },
          igst: { $sum: '$igst_amount' }
      } }
    ]);

    return res.json({
      success: true,
      outwardTaxLiability: {
        cgst: outputTaxAgg[0]?.cgst || 0,
        sgst: outputTaxAgg[0]?.sgst || 0,
        igst: outputTaxAgg[0]?.igst || 0
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'GSTR-3B process aborted', error: err.message });
  }
};

// 4. HSN Summary Report
export const getHsnSummary = async (req, res) => {
  const branchId = req.user?.branch_id || 'b360-branch-head';

  try {
    const list = await Invoice.aggregate([
      { $match: { branch_id: branchId } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.hsn_code',
          hsn_code: { $first: '$items.hsn_code' },
          description: { $first: '$items.name' },
          total_qty: { $sum: '$items.quantity' },
          taxable_value: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          gst_rate: { $first: { $add: ['$items.cgst_percent', '$items.sgst_percent', '$items.igst_percent'] } },
          tax_amount: { $sum: { $add: ['$items.cgst_amount', '$items.sgst_amount', '$items.igst_amount'] } }
      } },
      { $project: { _id: 0 } }
    ]);

    return res.json({
      success: true,
      data: list
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'HSN code aggregates generation failed', error: err.message });
  }
};
