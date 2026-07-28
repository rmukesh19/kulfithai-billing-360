import { Supplier } from '../models/Supplier.js';
import { auditLog } from '../middleware/logger.js';

export const getSuppliers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const suppliers = await Supplier.find({ branch_id: branchId, status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();
    const formatted = suppliers.map(s => ({
      id: s._id,
      ...s,
      gstIn: s.gstin || '',
      balance: s.current_balance || 0,
      dueAmount: s.due_amount || 0
    }));
    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addSupplier = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';
  const { name, company_name, phone, email, address, city, state, gstin, gstIn, category, price, balance } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required for supplier.' });
  }

  try {
    const supplier = new Supplier({
      _id: req.body.id || undefined,
      branch_id: branchId,
      name,
      company_name: company_name || '',
      phone,
      email: email || '',
      address: address || '',
      city: city || '',
      state: state || '',
      gstin: gstin || gstIn || '',
      category: category || '',
      price: price || 0,
      current_balance: balance || 0,
      status: 'active'
    });

    await supplier.save();
    await auditLog(branchId, userId, 'SUPPLIER_CREATED', 'suppliers', `Supplier ${name} created`);

    return res.status(201).json({
      success: true,
      message: 'Supplier added successfully.',
      data: {
        id: supplier._id,
        ...supplier.toObject(),
        gstIn: supplier.gstin,
        balance: supplier.current_balance
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

    if (body.name !== undefined) supplier.name = body.name;
    if (body.company_name !== undefined) supplier.company_name = body.company_name;
    if (body.phone !== undefined) supplier.phone = body.phone;
    if (body.email !== undefined) supplier.email = body.email;
    if (body.address !== undefined) supplier.address = body.address;
    if (body.city !== undefined) supplier.city = body.city;
    if (body.state !== undefined) supplier.state = body.state;
    if (body.gstin !== undefined) supplier.gstin = body.gstin;
    if (body.gstIn !== undefined) supplier.gstin = body.gstIn;
    if (body.category !== undefined) supplier.category = body.category;
    if (body.price !== undefined) supplier.price = body.price;
    if (body.balance !== undefined) supplier.current_balance = body.balance;
    if (body.current_balance !== undefined) supplier.current_balance = body.current_balance;

    await supplier.save();

    return res.json({
      success: true,
      message: 'Supplier updated successfully.',
      data: {
        id: supplier._id,
        ...supplier.toObject(),
        gstIn: supplier.gstin,
        balance: supplier.current_balance
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  const { id } = req.params;
  try {
    const supplier = await Supplier.findById(id);
    if (supplier) {
      supplier.status = 'deleted';
      await supplier.save();
    }
    return res.json({ success: true, message: 'Supplier deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
