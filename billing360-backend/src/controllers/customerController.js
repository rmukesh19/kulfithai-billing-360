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
  const { name, phone, email, address, city, state, gstin, gstIn, credit_limit, creditLimit, price, balance } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required for customer.' });
  }

  try {
    const customer = new Customer({
      _id: req.body.id || undefined,
      branch_id: branchId,
      name,
      phone,
      email: email || '',
      address: address || '',
      city: city || '',
      state: state || '',
      gstin: gstin || gstIn || '',
      credit_limit: creditLimit !== undefined ? creditLimit : (credit_limit !== undefined ? credit_limit : 0),
      price: price || 0,
      current_balance: balance || 0,
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
  const body = req.body;

  try {
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

    if (body.name !== undefined) customer.name = body.name;
    if (body.phone !== undefined) customer.phone = body.phone;
    if (body.email !== undefined) customer.email = body.email;
    if (body.address !== undefined) customer.address = body.address;
    if (body.city !== undefined) customer.city = body.city;
    if (body.state !== undefined) customer.state = body.state;
    if (body.gstin !== undefined) customer.gstin = body.gstin;
    if (body.gstIn !== undefined) customer.gstin = body.gstIn;
    if (body.credit_limit !== undefined) customer.credit_limit = body.credit_limit;
    if (body.creditLimit !== undefined) customer.credit_limit = body.creditLimit;
    if (body.price !== undefined) customer.price = body.price;
    if (body.balance !== undefined) customer.current_balance = body.balance;
    if (body.current_balance !== undefined) customer.current_balance = body.current_balance;

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
      customer.status = 'deleted';
      await customer.save();
    }
    return res.json({ success: true, message: 'Customer deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
