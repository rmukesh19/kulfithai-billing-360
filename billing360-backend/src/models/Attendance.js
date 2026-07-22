import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee_id: { type: String, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent', 'half_day', 'leave'], required: true },
  notes: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// Composite unique index
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
