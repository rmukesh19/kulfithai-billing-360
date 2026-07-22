export const billingLogger = (req, res, next) => {
  console.log(`[Enterprise billing] Requester IP: ${req.ip} | Method: ${req.method} | Path: ${req.originalUrl}`);
  next();
};
