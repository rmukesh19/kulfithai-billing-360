import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const customerSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  gstin: { type: String, default: '' },
  credit_limit: { type: Number, default: 0.00 },
  price: { type: Number, default: 0.00 },
  current_balance: { type: Number, default: 0.00 },
  due_amount: { type: Number, default: 0.00 },
  status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Customer = mongoose.model('Customer', customerSchema);
