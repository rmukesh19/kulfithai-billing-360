import { Customer } from '../models/Customer.js';
import { auditLog } from '../middleware/logger.js';

export const getCustomers = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const customers = await Customer.find({ branch_id: branchId, status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();
    const formatted = customers.map(c => ({
      id: c._id,
      ...c,
      gstIn: c.gstin || '',
      creditLimit: c.credit_limit || 0,
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
  const { name, phone, email, address, city, state, gstin, gstIn, credit_limit, creditLimit, balance } = req.body;

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
      city: city || '',
      state: state || '',
      gstin: gstin || gstIn || '',
      credit_limit: creditLimit !== undefined ? Number(creditLimit) : (credit_limit !== undefined ? Number(credit_limit) : 50000),
      current_balance: balance !== undefined ? Number(balance) : 0,
      status: 'active'
    });

    await customer.save();
    await auditLog(branchId, userId, 'CUSTOMER_CREATED', 'customers', `Customer ${name} created`);

    return res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      data: {
        id: customer._id,
        ...customer.toObject(),
        gstIn: customer.gstin,
        creditLimit: customer.credit_limit,
        balance: customer.current_balance
      }
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

    if (updateData.balance !== undefined) customer.current_balance = Number(updateData.balance);
    if (updateData.current_balance !== undefined) customer.current_balance = Number(updateData.current_balance);
    if (updateData.creditLimit !== undefined) customer.credit_limit = Number(updateData.creditLimit);
    if (updateData.credit_limit !== undefined) customer.credit_limit = Number(updateData.credit_limit);
    if (updateData.gstIn !== undefined) customer.gstin = updateData.gstIn;
    if (updateData.gstin !== undefined) customer.gstin = updateData.gstin;
    if (updateData.name !== undefined) customer.name = updateData.name;
    if (updateData.phone !== undefined) customer.phone = updateData.phone;
    if (updateData.email !== undefined) customer.email = updateData.email;
    if (updateData.address !== undefined) customer.address = updateData.address;
    if (updateData.city !== undefined) customer.city = updateData.city;
    if (updateData.state !== undefined) customer.state = updateData.state;

    await customer.save();

    return res.json({
      success: true,
      message: 'Customer updated successfully.',
      data: {
        id: customer._id,
        ...customer.toObject(),
        gstIn: customer.gstin,
        creditLimit: customer.credit_limit,
        balance: customer.current_balance
      }
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
