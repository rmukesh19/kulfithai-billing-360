import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const supplierSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  name: { type: String, required: true },
  company_name: { type: String, default: '' },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  gstin: { type: String, default: '' },
  category: { type: String, default: '' },
  price: { type: Number, default: 0.00 },
  current_balance: { type: Number, default: 0.00 },
  due_amount: { type: Number, default: 0.00 },
  status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Supplier = mongoose.model('Supplier', supplierSchema);
