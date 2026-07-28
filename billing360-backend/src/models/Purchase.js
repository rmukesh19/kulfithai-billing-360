import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  product_id: { type: String },
  name: { type: String },
  sku: { type: String },
  quantity: { type: Number, default: 0 },
  purchase_price: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  _id: { type: String },
  branch_id: { type: String, required: true, index: true },
  supplier_id: { type: String, default: null },
  supplier_name: { type: String, default: '' },
  purchase_number: { type: String },
  items: [purchaseItemSchema],
  subtotal: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  payment_mode: { type: String, enum: ['cash', 'card', 'upi', 'bank', 'credit'], default: 'cash' },
  paid_amount: { type: Number, default: 0 },
  due_amount: { type: Number, default: 0 },
  order_status: { type: String, enum: ['pending', 'received', 'partial', 'cancelled'], default: 'received' },
  notes: { type: String, default: '' },
  purchase_date: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { _id: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
