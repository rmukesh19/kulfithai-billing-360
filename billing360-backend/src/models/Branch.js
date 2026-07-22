import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const branchSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  gstin: { type: String },
  upi_id: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  financial_start: { type: Date, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Branch = mongoose.model('Branch', branchSchema);
