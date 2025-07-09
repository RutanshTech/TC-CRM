// Dashboard Controller\
const Lead = require('../models/Lead');

// 1. Overview: Total leads, Payments (mocked), Fresh leads, Follow-ups
exports.getOverviewStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalLeads = await Lead.countDocuments();
    const todaysLeads = await Lead.countDocuments({
      createdAt: {
        $gte: new Date(`${today}T00:00:00.000Z`),
        $lte: new Date(`${today}T23:59:59.999Z`)
      }
    });

    const todaysFollowUps = await Lead.countDocuments({
      nextFollowUpDate: { $eq: today }
    });

    // Payment logic placeholder
    const paymentsToday = 0;

    res.json({
      totalLeads,
      paymentsToday,
      todaysLeads,
      todaysFollowUps
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting overview stats', error });
  }
};

// 2. Today's follow-ups with status filters
exports.getTodayFollowUps = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const leads = await Lead.find({
      assignedTo: req.user.id,
      nextFollowUpDate: today
    });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error getting today’s follow-ups', error });
  }
};

// 3. WhatsApp Stats (mocked stats)
exports.getWhatsAppStats = async (req, res) => {
  try {
    // You'd use actual message logs from a real WhatsApp API
    res.json({
      totalMessagedToday: 25,
      totalRepliesToday: 9
    });
  } catch (error) {
    res.status(500).json({ message: 'Error getting WhatsApp stats', error });
  }
};

// 4. My Leads (all assigned)
exports.getAssignedLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ assignedTo: req.user.id }).sort({ updatedAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error });
  }
};
