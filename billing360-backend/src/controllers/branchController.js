import { Branch } from '../models/Branch.js';

export const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ status: 'active' }).sort({ name: 1 }).lean();
    return res.json({ success: true, data: branches.map(b => ({ id: b._id, ...b })) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addBranch = async (req, res) => {
  const { name, code, gstin, upi_id, phone, email, address } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Branch name is required.' });
  }

  try {
    const branch = new Branch({
      name,
      code: code || `BR-${Date.now().toString(36).toUpperCase()}`,
      gstin: gstin || '',
      upi_id: upi_id || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      financial_start: new Date(`${new Date().getFullYear()}-04-01`),
      status: 'active'
    });

    await branch.save();
    return res.status(201).json({ success: true, data: { id: branch._id, ...branch.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  const { id } = req.params;
  try {
    const branch = await Branch.findByIdAndUpdate(id, req.body, { new: true });
    return res.json({ success: true, data: { id: branch._id, ...branch.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
