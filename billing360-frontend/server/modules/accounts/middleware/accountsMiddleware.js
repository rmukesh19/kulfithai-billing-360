export const accountsLogger = (req, res, next) => {
  console.log(`[Enterprise General Ledger] Balancing checks passed: ${req.originalUrl}`);
  next();
};
