import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';

dotenv.config();

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/billing360_db';
    console.log('[Seed] Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    // 1. Seed Branch
    let branch = await Branch.findOne({ _id: 'b360-branch-head' });
    if (!branch) {
      branch = new Branch({
        _id: 'b360-branch-head',
        name: 'Billing360 Chennai HQ',
        code: 'CHQ01',
        gstin: '33AAAAA1111A1Z5',
        upi_id: 'billing360@upi',
        phone: '9876543210',
        email: 'hq@billing360.com',
        address: 'No 12, GST Road, Guindy, Chennai - 600032',
        financial_start: new Date('2026-04-01'),
        status: 'active'
      });
      await branch.save();
      console.log('[Seed] Default branch created');
    }

    // 2. Seed Admin User
    const adminEmail = 'admin@billing360.com';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      adminUser = new User({
        _id: 'b360-user-admin',
        branch_id: branch._id,
        name: 'System Administrator',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'Admin',
        status: 'active'
      });
      await adminUser.save();
      console.log('[Seed] Default admin user created (admin@billing360.com / admin123)');
    } else {
      console.log('[Seed] Admin user already exists');
    }

    // 3. Seed Categories
    let category = await Category.findOne({ _id: 'cat-elec' });
    if (!category) {
      await Category.insertMany([
        { _id: 'cat-elec', name: 'Electronics', parent_id: null, status: 'active' },
        { _id: 'cat-appl', name: 'Home Appliances', parent_id: null, status: 'active' },
        { _id: 'cat-mobi', name: 'Smartphones & Accessories', parent_id: 'cat-elec', status: 'active' }
      ]);
      console.log('[Seed] Default categories created');
    }

    // 4. Seed Products
    let product = await Product.findOne({ _id: 'prod-iphone' });
    if (!product) {
      await Product.insertMany([
        {
          _id: 'prod-iphone',
          branch_id: branch._id,
          category_id: 'cat-mobi',
          name: 'iPhone 15 Pro Max',
          sku: 'IPHONE15PM',
          barcode: '190198155845',
          hsn_code: '85171300',
          gst_percent: 18.00,
          purchase_price: 110000.00,
          selling_price: 139900.00,
          stock_qty: 45.00,
          low_stock_alert_level: 5.00,
          unit: 'pcs'
        },
        {
          _id: 'prod-charger',
          branch_id: branch._id,
          category_id: 'cat-mobi',
          name: 'Apple 20W USB-C Adapter',
          sku: 'APPLE20WADAP',
          barcode: '194252156994',
          hsn_code: '85044090',
          gst_percent: 18.00,
          purchase_price: 12000.00,
          selling_price: 1900.00,
          stock_qty: 120.00,
          low_stock_alert_level: 15.00,
          unit: 'pcs'
        }
      ]);
      console.log('[Seed] Default products created');
    }

    // 5. Seed Customers
    let customer = await Customer.findOne({ _id: 'cust-walkin' });
    if (!customer) {
      await Customer.insertMany([
        {
          _id: 'cust-walkin',
          branch_id: branch._id,
          name: 'Walk-in Customer',
          phone: '9999999999',
          email: 'walkin@billing360.com',
          address: 'Counter checkout',
          credit_limit: 0,
          current_balance: 0,
          due_amount: 0
        },
        {
          _id: 'cust-corp',
          branch_id: branch._id,
          name: 'Karthik Ventures Pvt Ltd',
          phone: '9840123456',
          email: 'info@karthikventures.com',
          address: 'Tech Park, Taramani, Chennai',
          gstin: '33AAACK1234F1Z1',
          credit_limit: 200000.00,
          current_balance: 45000.00,
          due_amount: 45000.00
        }
      ]);
      console.log('[Seed] Default customers created');
    }

    console.log('[Seed] Data seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
};

seedDB();
