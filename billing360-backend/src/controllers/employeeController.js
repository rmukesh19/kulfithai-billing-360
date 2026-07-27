import { Employee } from '../models/Employee.js';

export const getEmployees = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const employees = await Employee.find({ branch_id: branchId, status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: employees.map(e => ({ id: e._id, ...e })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addEmployee = async (req, res) => {
  const branchId = req.body.branchId || req.user?.branch_id || 'b360-branch-head';
  const { name, phone, role, salary, joining_date } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required for employee.' });
  }

  try {
    const emp = new Employee({
      branch_id: branchId,
      name,
      phone,
      role: role || 'Staff',
      salary: salary || 15000,
      joining_date: joining_date || new Date(),
      status: 'active'
    });

    await emp.save();
    return res.status(201).json({ success: true, data: { id: emp._id, ...emp.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const emp = await Employee.findByIdAndUpdate(id, req.body, { new: true });
    return res.json({ success: true, data: { id: emp._id, ...emp.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    await Employee.findByIdAndUpdate(id, { status: 'inactive' });
    return res.json({ success: true, message: 'Employee marked inactive.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
