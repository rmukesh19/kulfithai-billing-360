import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  _id: { type: String },
  branch_id: { type: String, required: true, unique: true, index: true },
  language: { type: String, default: 'English' },
  currency: { type: String, default: 'INR' },
  tax_type: { type: String, default: 'GST' },
  invoice_prefix: { type: String, default: 'INV' },
  invoice_footer: { type: String, default: '' },
  business_name: { type: String, default: '' },
  business_address: { type: String, default: '' },
  business_phone: { type: String, default: '' },
  business_email: { type: String, default: '' },
  gstin: { type: String, default: '' },
  logo_url: { type: String, default: '' },
  upi_id: { type: String, default: '' },
  low_stock_threshold: { type: Number, default: 5 },
  enable_notifications: { type: Boolean, default: true },
  updated_at: { type: Date, default: Date.now }
}, { _id: false });

export const Settings = mongoose.model('Settings', settingsSchema);
