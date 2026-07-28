import { Settings } from '../models/Settings.js';
import { v4 as uuidv4 } from 'uuid';

export const getSettings = async (req, res) => {
  const branchId = req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    let settings = await Settings.findOne({ branch_id: branchId }).lean();
    if (!settings) {
      // Return defaults if no settings found yet
      settings = { branch_id: branchId, language: 'English', currency: 'INR', tax_type: 'GST' };
    }
    return res.json({ success: true, data: { id: settings._id || branchId, ...settings } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const saveSettings = async (req, res) => {
  const branchId = req.body.branchId || req.query.branchId || req.user?.branch_id || 'b360-branch-head';
  try {
    const updateData = { ...req.body, branch_id: branchId, updated_at: new Date() };
    delete updateData.branchId;
    delete updateData._id;
    delete updateData.id;

    const settings = await Settings.findOneAndUpdate(
      { branch_id: branchId },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: 'Settings saved.', data: { id: settings._id, ...settings.toObject() } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
