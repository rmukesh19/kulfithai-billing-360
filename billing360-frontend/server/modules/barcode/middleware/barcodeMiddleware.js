export const barcodeLogger = (req, res, next) => {
  console.log(`[Enterprise Barcode Service] Hit path: ${req.originalUrl}`);
  next();
};
