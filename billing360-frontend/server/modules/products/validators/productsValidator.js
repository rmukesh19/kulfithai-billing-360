export const validateProduct = (req, res, next) => {
  const { name, sellingPrice, branchId } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Product name is required'
    });
  }

  if (sellingPrice === undefined || sellingPrice < 0) {
    return res.status(400).json({
      success: false,
      error: 'Product sellingPrice is required and must be non-negative'
    });
  }

  if (!branchId) {
    return res.status(400).json({
      success: false,
      error: 'branchId is required'
    });
  }

  next();
};
