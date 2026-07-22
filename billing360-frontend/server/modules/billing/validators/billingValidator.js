export const validateInvoice = (req, res, next) => {
  const { customerName, branchId, items } = req.body;

  if (!customerName) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: customerName is required'
    });
  }

  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: branchId is required'
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: items must be a non-empty array'
    });
  }

  next();
};
