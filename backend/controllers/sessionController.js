// Session Controller
const SessionLog = require('../models/SessionLog');
const User = require('../models/User');

// Employee pings to update activity timestamp
exports.updateActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await SessionLog.findOneAndUpdate(
      { userId },
      { lastActivity: new Date(), isActive: true },
      { upsert: true, new: true }
    );

    res.json({ message: 'Activity updated', session });
  } catch (error) {
    res.status(500).json({ message: 'Error updating activity', error });
  }
};

// Admin reactivates employee session after timeout
exports.reactivateSession = async (req, res) => {
  try {
    const { employeeId, reason } = req.body;

    const session = await SessionLog.findOneAndUpdate(
      { userId: employeeId },
      { isActive: true, reasonForReactivation: reason, lastActivity: new Date() },
      { new: true }
    );

    res.json({ message: 'Session reactivated', session });
  } catch (error) {
    res.status(500).json({ message: 'Error reactivating session', error });
  }
};

// (Optional) Employee checks their session status
exports.getMySessionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await SessionLog.findOne({ userId });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json({
      status: session.isActive ? 'active' : 'inactive',
      lastActivity: session.lastActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching session status', error });
  }
};
