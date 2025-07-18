// Call Validation Middleware
const CallLog = require('../models/CallLog');

const validateCallBeforeStatusUpdate = async (req, res, next) => {
  const { leadId } = req.body;
  const userId = req.user.id;

  const existing = await CallLog.findOne({ userId, leadId });

  if (!existing) {
    return res.status(400).json({ message: 'You must make a call before updating status.' });
  }

  next();
};

module.exports = validateCallBeforeStatusUpdate;
