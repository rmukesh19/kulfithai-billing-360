import * as gstService from '../services/gstService.js';

export const getGstr1Report = async (req, res) => {
  try {
    const { branchId, year, month } = req.query;
    const reportList = await gstService.calculateGstr1(branchId, parseInt(year), parseInt(month));
    return res.status(200).json({
      success: true,
      data: reportList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getGstr3bReport = async (req, res) => {
  try {
    const { branchId, year, month } = req.query;
    const reportList = await gstService.calculateGstr3b(branchId, parseInt(year), parseInt(month));
    return res.status(200).json({
      success: true,
      data: reportList
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
