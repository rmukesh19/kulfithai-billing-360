import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'billing360_secure_jwt_secret_token';

router.post('/login', (req, res) => {
  const { type, email, username, password, clientProfile } = req.body;

  let payload = {};

  if (type === 'admin') {
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required for Admin login' });
    }
    
    payload = {
      uid: 'admin-' + Buffer.from(email).toString('base64'),
      email: email,
      username: email,
      name: clientProfile?.name || 'Administrator',
      role: 'Super Admin',
      branchId: clientProfile?.branchId || 'main-branch',
      permissions: ['can_bill', 'can_manage_inventory', 'can_view_reports', 'can_manage_employees', 'can_manage_accounts', 'can_manage_branches']
    };
  } else {
    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required for Staff login' });
    }

    payload = {
      uid: clientProfile?.id || 'emp-' + Math.random().toString(36).substr(2, 9),
      username: username,
      name: clientProfile?.name || username,
      role: clientProfile?.role || 'Staff',
      branchId: clientProfile?.branchId || 'main-branch',
      permissions: clientProfile?.permissions || ['can_bill']
    };
  }

  // Generate JWT token with 24 hour expiration
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

  return res.json({
    success: true,
    token,
    userProfile: {
      ...payload,
      token
    }
  });
});

export default router;
