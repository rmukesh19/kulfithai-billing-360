import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const categorySchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  parent_id: { type: String, ref: 'Category', default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Category = mongoose.model('Category', categorySchema);
