// IP Restriction Middleware
const User = require('../models/User');

const ipRestrictionMiddleware = async (req, res, next) => {
  const userId = req.user?.id;
  const ip = req.ip;

  const user = await User.findById(userId);
  if (!user || !user.ipWhitelist.includes(ip)) {
    return res.status(403).json({ message: 'Access denied from this IP' });
  }

  next();
};

module.exports = ipRestrictionMiddleware;
