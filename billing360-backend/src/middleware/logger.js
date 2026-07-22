import { AuditLog } from '../models/AuditLog.js';

// Global request logger
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    const userString = req.user ? `User: ${req.user.email} (${req.user.role})` : 'Guest';
    console.log(`[Request] [${req.method}] ${req.path} - RefStatus: ${res.statusCode} - ${elapsed}ms | ${userString} | IP: ${req.ip}`);
  });
  next();
};

// Enterprise operational audit helper to insert logs centrally
export async function auditLog(
  branchId,
  userId,
  action,
  targetTable,
  details,
  ipAddress = null
) {
  try {
    const log = new AuditLog({
      branch_id: branchId,
      user_id: userId,
      action: action,
      target_table: targetTable,
      details: details,
      ip_address: ipAddress
    });
    await log.save();
  } catch (error) {
    console.error('[Audit Logger] Failed to persist audit logs:', error);
  }
}
