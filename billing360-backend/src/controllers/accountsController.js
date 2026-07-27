import mongoose from 'mongoose';
import { Voucher } from '../models/Voucher.js';
import { Ledger } from '../models/Ledger.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';
import { auditLog } from '../middleware/logger.js';

// ─── VOUCHERS ──────────────────────────────────────────────────────────────

export const getVouchers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  const { type, paymentMode, from, to } = req.query;
  try {
    let query = { branch_id: branchId };
    if (type) query.type = type;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    const vouchers = await Voucher.find(query).sort({ date: -1 }).lean();
    return res.json({ success: true, data: vouchers.map(v => ({ id: v._id, ...v, amount: v.total_amount })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addVoucher = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';
  const { type, amount, description, narration, entityId, entityType, paymentMode, ledgerId, date } = req.body;
  if (!type || amount === undefined) return res.status(400).json({ success: false, message: 'Type and amount required.' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const count = await Voucher.countDocuments({ branch_id: branchId, type });
    const voucherNum = `${type.toUpperCase()}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const voucher = new Voucher({
      branch_id: branchId,
      user_id: userId,
      type, voucher_num: voucherNum,
      total_amount: Number(amount),
      narration: narration || description || '',
      date: date ? new Date(date) : new Date()
    });
    await voucher.save({ session });

    // Update entity balances
    if (entityId && entityType === 'customer') {
      const delta = type === 'receipt' ? -Number(amount) : Number(amount);
      await Customer.findByIdAndUpdate(entityId, { $inc: { current_balance: delta, due_amount: delta } }, { session });
    } else if (entityId && entityType === 'supplier') {
      const delta = type === 'payment' ? -Number(amount) : Number(amount);
      await Supplier.findByIdAndUpdate(entityId, { $inc: { current_balance: delta, due_amount: delta } }, { session });
    }

    // Double-entry ledger posting
    const ledgerEntry = new Ledger({
      branch_id: branchId,
      party_id: entityId || userId,
      party_type: entityType === 'customer' ? 'customer' : (entityType === 'supplier' ? 'supplier' : 'general'),
      ref_id: voucher._id,
      ref_type: type === 'receipt' ? 'receipt_voucher' : (type === 'payment' ? 'payment_voucher' : 'journal_voucher'),
      debit: type === 'payment' ? Number(amount) : 0,
      credit: type === 'receipt' ? Number(amount) : 0,
      narration: voucher.narration,
      entry_date: voucher.date
    });
    await ledgerEntry.save({ session });

    await session.commitTransaction();
    session.endSession();

    await auditLog(branchId, userId, 'VOUCHER_CREATED', 'vouchers', `${type} voucher ${voucherNum} for ₹${amount}`);
    return res.status(201).json({ success: true, message: 'Voucher created.', data: { id: voucher._id, ...voucher.toObject(), amount: voucher.total_amount } });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVoucher = async (req, res) => {
  const { id } = req.params;
  try {
    await Voucher.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Voucher deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── LEDGERS ───────────────────────────────────────────────────────────────

export const getLedgers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  const { partyId, partyType } = req.query;
  try {
    let query = { branch_id: branchId };
    if (partyId) query.party_id = partyId;
    if (partyType) query.party_type = partyType;
    const ledgers = await Ledger.find(query).sort({ entry_date: -1 }).lean();
    return res.json({ success: true, data: ledgers.map(l => ({ id: l._id, ...l })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PURCHASES (for purchase ledger / accounts payable) ───────────────────

export const getPurchases = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const purchases = await Ledger.find({ branch_id: branchId, ref_type: 'payment_voucher' })
      .sort({ entry_date: -1 }).lean();
    return res.json({ success: true, data: purchases.map(p => ({ id: p._id, ...p })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TRIAL BALANCE ─────────────────────────────────────────────────────────

export const getTrialBalance = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const agg = await Ledger.aggregate([
      { $match: { branch_id: branchId } },
      { $group: {
        _id: '$party_type',
        total_debit: { $sum: '$debit' },
        total_credit: { $sum: '$credit' }
      }}
    ]);
    return res.json({ success: true, data: agg });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
