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
  const { name, company_name, phone, email, address, city, state, gstin, gstIn, balance } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required for supplier.' });
  }

  try {
    const supplier = new Supplier({
      branch_id: branchId,
      name,
      company_name: company_name || '',
      phone,
      email: email || '',
      address: address || '',
      city: city || '',
      state: state || '',
      gstin: gstin || gstIn || '',
      current_balance: balance !== undefined ? Number(balance) : 0,
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
  const updateData = { ...req.body };

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });

    if (updateData.balance !== undefined) supplier.current_balance = Number(updateData.balance);
    if (updateData.current_balance !== undefined) supplier.current_balance = Number(updateData.current_balance);
    if (updateData.gstIn !== undefined) supplier.gstin = updateData.gstIn;
    if (updateData.gstin !== undefined) supplier.gstin = updateData.gstin;
    if (updateData.name !== undefined) supplier.name = updateData.name;
    if (updateData.company_name !== undefined) supplier.company_name = updateData.company_name;
    if (updateData.phone !== undefined) supplier.phone = updateData.phone;
    if (updateData.email !== undefined) supplier.email = updateData.email;
    if (updateData.address !== undefined) supplier.address = updateData.address;
    if (updateData.city !== undefined) supplier.city = updateData.city;
    if (updateData.state !== undefined) supplier.state = updateData.state;

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
      supplier.status = 'inactive';
      await supplier.save();
    }
    return res.json({ success: true, message: 'Supplier marked inactive.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
