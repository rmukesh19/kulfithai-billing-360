import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const productSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  category_id: { type: String, ref: 'Category' },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  barcode: { type: String },
  hsn_code: { type: String, required: true },
  gst_percent: { type: Number, default: 18.00 },
  purchase_price: { type: Number, default: 0.00 },
  selling_price: { type: Number, default: 0.00 },
  stock_qty: { type: Number, default: 0.00 },
  low_stock_alert_level: { type: Number, default: 5.00 },
  unit: { type: String, default: 'pcs' },
  image_url: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Product = mongoose.model('Product', productSchema);
