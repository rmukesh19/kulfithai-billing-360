export const validateBulkImport = (req, res, next) => {
  const { importType, data, branchId } = req.body;

  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: branchId is required'
    });
  }

  if (!importType) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: importType is required'
    });
  }

  const validTypes = ['products', 'customers', 'suppliers', 'opening_stock', 'accounts_ledger', 'gst_data'];
  if (!validTypes.includes(importType)) {
    return res.status(400).json({
      success: false,
      error: `Validation failed: invalid importType. Must be one of: ${validTypes.join(', ')}`
    });
  }

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: data must be a non-empty array'
    });
  }

  next();
};

export const validateRollback = (req, res, next) => {
  const { importId, branchId } = req.body;

  if (!importId) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: importId is required'
    });
  }

  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed: branchId is required'
    });
  }

  next();
};
