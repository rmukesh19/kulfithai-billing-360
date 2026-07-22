import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const supplierSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  name: { type: String, required: true },
  company_name: { type: String },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  gstin: { type: String },
  current_balance: { type: Number, default: 0.00 },
  due_amount: { type: Number, default: 0.00 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Supplier = mongoose.model('Supplier', supplierSchema);
