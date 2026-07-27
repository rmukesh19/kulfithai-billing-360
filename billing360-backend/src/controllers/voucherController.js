import { Voucher } from '../models/Voucher.js';
import { Ledger } from '../models/Ledger.js';
import { Customer } from '../models/Customer.js';
import { Supplier } from '../models/Supplier.js';

export const getVouchers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const vouchers = await Voucher.find({ branch_id: branchId }).sort({ date: -1 }).lean();
    return res.json({ success: true, data: vouchers.map(v => ({ id: v._id, ...v })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addVoucher = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';
  const { type, amount, narration, description, entityId, entityType, date } = req.body;

  try {
    const count = await Voucher.countDocuments({ branch_id: branchId });
    const voucher_num = `VCH-${type.toUpperCase().slice(0, 3)}-${String(count + 1).padStart(5, '0')}`;

    const voucher = new Voucher({
      branch_id: branchId,
      user_id: userId,
      type: type || 'receipt',
      voucher_num,
      total_amount: amount || 0,
      narration: narration || description || '',
      date: date || new Date()
    });

    await voucher.save();

    // Update balances if entityId passed
    if (entityId && entityType === 'customer') {
      const cust = await Customer.findById(entityId);
      if (cust) {
        cust.current_balance += (type === 'receipt' ? -Number(amount) : Number(amount));
        await cust.save();
      }
    } else if (entityId && entityType === 'supplier') {
      const sup = await Supplier.findById(entityId);
      if (sup) {
        sup.current_balance += (type === 'payment' ? -Number(amount) : Number(amount));
        await sup.save();
      }
    }

    return res.status(201).json({ success: true, data: { id: voucher._id, ...voucher.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getLedgers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const ledgers = await Ledger.find({ branch_id: branchId }).sort({ created_at: -1 }).lean();
    return res.json({ success: true, data: ledgers.map(l => ({ id: l._id, ...l })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addLedger = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const { name, group, openingBalance } = req.body;

  try {
    const ledger = new Ledger({
      branch_id: branchId,
      party_id: req.body.party_id || 'GENERAL',
      party_type: group || 'customer',
      ref_id: req.body.ref_id || 'OPENING',
      ref_type: 'opening_balance',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      narration: name || 'Account Ledger'
    });

    await ledger.save();
    return res.status(201).json({ success: true, data: { id: ledger._id, ...ledger.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
