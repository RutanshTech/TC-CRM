// Role Based Access Middleware
const roleMiddleware = (roles) => {
    return (req, res, next) => {
      const user = req.user;
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      // Special case for operation creation
      if (roles.includes('operation-create')) {
        if (user.role === 'super-admin') return next();
        if (user.role === 'admin' && user.adminAccess && user.adminAccess.operation) return next();
        return res.status(403).json({ message: 'You do not have permission to create operations.' });
      }

      // Default role check
      if (roles.includes(user.role)) return next();
      return res.status(403).json({ message: 'Forbidden' });
    };
};

// Permission Based Access Middleware
const permissionMiddleware = (requiredPermission) => {
    return (req, res, next) => {
      // Super admin has all permissions
      if (req.user.role === 'super-admin') {
        return next();
      }
      
      // Check if user is admin and has the required permission
      if (req.user.role === 'admin' && req.user.adminAccess) {
        if (req.user.adminAccess[requiredPermission] || req.user.adminAccess.allThings) {
          return next();
        }
      }
      
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    };
};

module.exports = { roleMiddleware, permissionMiddleware };
  