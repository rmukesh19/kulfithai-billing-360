import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'billing360_secure_jwt_secret_token';
const CONFIG_FILE = path.join(process.cwd(), 'server', 'data', 'config.json');

export const loadCompanySettings = (req, res, next) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileData = fs.readFileSync(CONFIG_FILE, 'utf8');
      req.companySettings = JSON.parse(fileData);
    } else {
      req.companySettings = {
        country: 'India',
        currency: 'INR',
        language: 'English',
        timezone: 'Asia/Kolkata',
        tax_type: 'GST',
        tax_percentage: 18,
        accounting_system: 'TallyPrime'
      };
    }
  } catch (err) {
    console.error('Failed to load company settings in middleware:', err);
    req.companySettings = {};
  }
  next();
};

export const authMiddleware = (req, res, next) => {
  // Allow OPTIONS preflight requests to pass through
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied: No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains uid, email/username, role, branchId, permissions, etc.
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        isExpired: true
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const hasRole = Array.isArray(roles) 
      ? roles.includes(req.user.role) 
      : req.user.role === roles;
      
    if (!hasRole && req.user.role !== 'Super Admin') {
      return res.status(403).json({ success: false, error: 'Access denied: Requires sufficient privileges' });
    }
    next();
  };
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const hasPermission = req.user.role === 'Super Admin' || req.user.permissions?.includes(permission);
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: `Access denied: Lacks permission ${permission}` });
    }
    next();
  };
};
