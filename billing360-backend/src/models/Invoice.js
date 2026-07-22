import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const invoiceItemSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  product_id: { type: String, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  hsn_code: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  cgst_percent: { type: Number, default: 9.00 },
  sgst_percent: { type: Number, default: 9.00 },
  igst_percent: { type: Number, default: 0.00 },
  cgst_amount: { type: Number, default: 0.00 },
  sgst_amount: { type: Number, default: 0.00 },
  igst_amount: { type: Number, default: 0.00 },
  total_amount: { type: Number, required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const invoiceSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  user_id: { type: String, ref: 'User', required: true },
  customer_id: { type: String, ref: 'Customer' },
  invoice_number: { type: String, required: true, unique: true },
  subtotal: { type: Number, default: 0.00 },
  discount_amount: { type: Number, default: 0.00 },
  cgst_amount: { type: Number, default: 0.00 },
  sgst_amount: { type: Number, default: 0.00 },
  igst_amount: { type: Number, default: 0.00 },
  total_amount: { type: Number, default: 0.00 },
  paid_amount: { type: Number, default: 0.00 },
  due_amount: { type: Number, default: 0.00 },
  payment_mode: { type: String, enum: ['cash', 'card', 'upi', 'credit'], default: 'upi' },
  status: { type: String, enum: ['paid', 'pending', 'cancelled'], default: 'paid' },
  billing_date: { type: Date, required: true },
  items: [invoiceItemSchema] // Embedded document for items
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
