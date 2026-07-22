export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Custom structured response
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
    errorCode: err.code || 'INTERNAL_ERROR',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  // Log to standard error stream with contextual metadata
  console.error(`[Error Handler] [${req.method}] ${req.path} - Ref: ${response.errorCode} - Msg: ${response.message}`);
  
  // Clean custom triggers for standard DB errors
  if (err.message && (err.message.includes('FOREIGN KEY') || err.message.includes('foreign key constraint'))) {
    res.status(409).json({
      success: false,
      message: 'Relation Violation: Cannot remove or update records linked to other entities.',
      errorCode: 'FOREIGN_KEY_CONFLICT'
    });
    return;
  }

  if (err.message && (err.message.includes('Duplicate entry') || err.message.includes('unique'))) {
    res.status(409).json({
      success: false,
      message: 'Resource Conflict: A record with unique fields already exists.',
      errorCode: 'DUPLICATE_KEY_CONFLICT'
    });
    return;
  }

  res.status(statusCode).json(response);
};
