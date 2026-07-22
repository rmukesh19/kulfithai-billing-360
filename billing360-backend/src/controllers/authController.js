import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Branch } from '../models/Branch.js';
import { auditLog } from '../middleware/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_sign_key_change_in_production';
const JWT_EXPIRE_IN = process.env.JWT_EXPIRE_IN || '8h';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.'
    });
  }

  try {
    const user = await User.findOne({ email }).populate('branch_id');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: User not found.'
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This account is currently suspended.'
      });
    }

    const isMatched = await bcrypt.compare(password, user.password_hash);
    if (!isMatched) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials: Incorrect security password.'
      });
    }

    const tokenPayload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id ? user.branch_id._id : null
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRE_IN });

    await auditLog(
      user.branch_id ? user.branch_id._id : null, 
      user._id, 
      'USER_LOGIN', 
      'users', 
      'User successfully authenticated via JWT', 
      req.ip
    );

    return res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branch_id ? user.branch_id._id : null,
        branchName: user.branch_id ? user.branch_id.name : null
      }
    });

  } catch (error) {
    console.error('[AuthController Login Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Server failed during authentication process.',
      error: error.message
    });
  }
};

export const register = async (req, res) => {
  const { branchId, name, email, password, role } = req.body;

  if (!branchId || !name || !email || !password) {
    return res.status(400).json({
      success: false,
      danger: true,
      message: 'BranchId, Name, Email, and Password must be defined.'
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email is already registered.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      branch_id: branchId,
      name,
      email,
      password_hash: passwordHash,
      role: role || 'Cashier',
      status: 'active'
    });

    await newUser.save();

    await auditLog(branchId, newUser._id, 'USER_REGISTERED', 'users', `New user registered with role ${role || 'Cashier'}`);

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      userId: newUser._id,
      data: {
        id: newUser._id,
        branchId,
        name,
        email,
        role: role || 'Cashier'
      }
    });
  } catch (error) {
    console.error('[AuthController Register Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user account.',
      error: error.message
    });
  }
};

export const getProfile = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthenticated.' });
  }

  return res.json({
    success: true,
    user: req.user
  });
};
