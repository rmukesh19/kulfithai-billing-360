export const productsLogger = (req, res, next) => {
  console.log(`[Enterprise Products] Method: ${req.method} | URL: ${req.originalUrl}`);
  next();
};
