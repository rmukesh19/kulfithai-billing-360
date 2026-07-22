import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const notificationSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  channel: { type: String, enum: ['system', 'whatsapp', 'email'], default: 'system' },
  recipient: { type: String },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  retry_count: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const Notification = mongoose.model('Notification', notificationSchema);
