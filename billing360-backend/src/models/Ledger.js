import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ledgerSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  party_id: { type: String, required: true }, // can reference Customer, Supplier, or general
  party_type: { type: String, enum: ['customer', 'supplier', 'general'], required: true },
  ref_id: { type: String }, // reference to invoice, voucher, etc.
  ref_type: { type: String, enum: ['invoice', 'payment_voucher', 'receipt_voucher', 'journal_voucher', 'opening_balance'], required: true },
  debit: { type: Number, default: 0.00 },
  credit: { type: Number, default: 0.00 },
  narration: { type: String },
  entry_date: { type: Date, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const Ledger = mongoose.model('Ledger', ledgerSchema);
