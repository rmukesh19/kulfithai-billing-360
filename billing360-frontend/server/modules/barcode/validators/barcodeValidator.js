export const validateBarcodeGen = (req, res, next) => {
  const { payload } = req.body;

  if (!payload || payload.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'payload is required to generate barcode'
    });
  }

  next();
};
