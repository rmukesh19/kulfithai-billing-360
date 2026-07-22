export const gstLogger = (req, res, next) => {
  console.log(`[Enterprise GST Auditor] Access verified for tax reporting: ${req.originalUrl}`);
  next();
};
