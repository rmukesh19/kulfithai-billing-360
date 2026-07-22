export const importsLogger = (req, res, next) => {
  const startTime = Date.now();
  console.log(`[Enterprise Import Service] Triggered path: ${req.originalUrl} | Method: ${req.method}`);
  
  res.on('finish', () => {
    const elapsed = Date.now() - startTime;
    console.log(`[Enterprise Import Service] Outgoing status: ${res.statusCode} | Duration: ${elapsed}ms`);
  });

  next();
};

export const checkFileSize = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      success: false,
      error: 'Payload Too Large: File upload exceeds 10MB limit'
    });
  }
  next();
};
