import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const stockTransactionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  product_id: { type: String, ref: 'Product', required: true },
  type: { type: String, enum: ['stock_entry', 'sale_deduction', 'purchase_addition', 'stock_transfer', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  source_branch_id: { type: String, ref: 'Branch' },
  target_branch_id: { type: String, ref: 'Branch' },
  ref_id: { type: String },
  notes: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
