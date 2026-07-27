import { Customer } from '../models/Customer.js';
import { auditLog } from '../middleware/logger.js';

export const getCustomers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const customers = await Customer.find({ branch_id: branchId, status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();
    const formatted = customers.map(c => ({
      id: c._id,
      ...c,
      balance: c.current_balance || 0,
      dueAmount: c.due_amount || 0
    }));
    return res.json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addCustomer = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const userId = req.user?.id || 'b360-user-admin';
  const { name, phone, email, address, gstin, credit_limit, balance } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required for customer.' });
  }

  try {
    const customer = new Customer({
      branch_id: branchId,
      name,
      phone,
      email: email || '',
      address: address || '',
      gstin: gstin || '',
      credit_limit: credit_limit || 50000,
      current_balance: balance || 0,
      status: 'active'
    });

    await customer.save();
    await auditLog(branchId, userId, 'CUSTOMER_CREATED', 'customers', `Customer ${name} created`);

    return res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      data: { id: customer._id, ...customer.toObject(), balance: customer.current_balance }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    if (updateData.balance !== undefined) updateData.current_balance = updateData.balance;

    Object.assign(customer, updateData);
    await customer.save();

    return res.json({
      success: true,
      message: 'Customer updated successfully.',
      data: { id: customer._id, ...customer.toObject(), balance: customer.current_balance }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await Customer.findById(id);
    if (customer) {
      customer.status = 'inactive';
      await customer.save();
    }
    return res.json({ success: true, message: 'Customer marked inactive.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
