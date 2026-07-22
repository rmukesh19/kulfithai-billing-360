export const validateTransaction = (req, res, next) => {
  const { type, amount, description, branchId } = req.body;

  if (!type || !['debit', 'credit'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'type must be either debit or credit'
    });
  }

  if (amount === undefined || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'amount must be greater than zero'
    });
  }

  if (!description) {
    return res.status(400).json({
      success: false,
      error: 'description is required'
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
