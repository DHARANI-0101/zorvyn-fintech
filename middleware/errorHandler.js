const errorHandler = (err, req, res, next) => {
  console.error("Error:", err); 

  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  
  if (err.code === "23505") {
    statusCode = 400;
    message = "Duplicate value error";
  }

  
  if (err.code === "23503") {
    statusCode = 400;
    message = "Invalid reference (foreign key)";
  }

  
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;