import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

   
    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing"
      });
    }

    
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Invalid authorization format"
      });
    }

    const token = parts[1];

  
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "JWT secret not configured"
      });
    }

   
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    req.user = decoded;

    next();

  } catch (err) {

   
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired. Please login again"
      });
    }

    return res.status(401).json({
      message: "Invalid token"
    });
  }
};

export default auth;