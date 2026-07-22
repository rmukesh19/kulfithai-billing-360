import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const employeeSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  branch_id: { type: String, ref: 'Branch', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, required: true },
  salary: { type: Number, required: true },
  joining_date: { type: Date, required: true },
  attendance_status: { type: String, enum: ['present', 'absent', 'half_day', 'on_leave'], default: 'present' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const Employee = mongoose.model('Employee', employeeSchema);
