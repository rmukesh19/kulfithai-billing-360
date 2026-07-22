import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const voucherSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  user_id: { type: String, ref: 'User', required: true },
  type: { type: String, enum: ['payment', 'receipt', 'journal'], required: true },
  voucher_num: { type: String, required: true, unique: true },
  total_amount: { type: Number, default: 0.00 },
  narration: { type: String },
  date: { type: Date, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const Voucher = mongoose.model('Voucher', voucherSchema);
