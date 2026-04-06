const authorize = (roles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized. Please login."
        });
      }

      const userRole = req.user.role;

      if (!userRole) {
        return res.status(403).json({
          message: "User role not found"
        });
      }

      const allowedRoles = roles.map(r => r.toUpperCase());

      if (!allowedRoles.includes(userRole.toUpperCase())) {
        return res.status(403).json({
          message: `Access denied for role: ${userRole}`
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        message: "Authorization error",
        error: err.message
      });
    }
  };
};

export default authorize;