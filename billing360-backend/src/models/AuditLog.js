import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  branch_id: { type: String, ref: 'Branch' },
  user_id: { type: String, ref: 'User' },
  action: { type: String, required: true },
  target_table: { type: String, required: true },
  details: { type: String },
  ip_address: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
