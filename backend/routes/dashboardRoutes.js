// Dashboard Routes
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getOverviewStats,
  getTodayFollowUps,
  getWhatsAppStats,
  getAssignedLeads
} = require('../controllers/dashboardController');

// Main dashboard stats (redirects to overview)
router.get('/stats', authMiddleware, getOverviewStats);

router.get('/overview', authMiddleware, roleMiddleware(['admin', 'super-admin']), getOverviewStats);
router.get('/today-followups', authMiddleware, getTodayFollowUps);
router.get('/whatsapp-stats', authMiddleware, roleMiddleware(['admin', 'super-admin']), getWhatsAppStats);
router.get('/my-leads', authMiddleware, getAssignedLeads);

module.exports = router;
