export const validateGstReport = (req, res, next) => {
  const { branchId, year, month } = req.query;

  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: 'branchId is required to generate GST report'
    });
  }

  if (!year || !month) {
    return res.status(400).json({
      success: false,
      error: 'year and month parameters are required'
    });
  }

  next();
};
