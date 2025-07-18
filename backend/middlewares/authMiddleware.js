// JWT Auth Middleware
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Unauthorized: Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // Debug log for troubleshooting
    console.log("authMiddleware: user is", req.user);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// Employee Access Middleware
const employeeAccessMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== 'employee') {
    return res.status(403).json({ message: "Access denied. Employee role required." });
  }

  // Check if employee is active
  if (req.user.isBlocked) {
    return res.status(403).json({ 
      message: "Account is blocked", 
      reason: req.user.blockedReason 
    });
  }

  console.log('Employee access granted:', {
    employeeId: req.user.employeeId,
    id: req.user.id,
    role: req.user.role
  });

  next();
};

const generateToken = (user) => {
  const tokenData = { 
    id: user._id, 
    email: user.email,
    role: user.role
  };

  // Add role-specific fields
  if (user.role === 'admin' || user.role === 'super-admin') {
    tokenData.adminAccess = user.adminAccess || null;
    tokenData.adminId = user.adminId;
  } else if (user.role === 'employee') {
    tokenData.employeeId = user.employeeId;
    tokenData.access = user.access || null;
    tokenData.isBlocked = user.isBlocked || false;
    tokenData.blockedReason = user.blockedReason;
  }

  console.log('Generating token for user:', {
    id: user._id,
    role: user.role,
    employeeId: user.employeeId,
    tokenData
  });

  return jwt.sign(tokenData, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });
};

module.exports = { authMiddleware, employeeAccessMiddleware, generateToken };
