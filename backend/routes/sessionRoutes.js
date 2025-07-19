// Session Routes
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { updateActivity, reactivateSession, getMySessionStatus } = require('../controllers/sessionController');

// Employee updates activity on every call or action
router.post('/activity', authMiddleware, updateActivity);

// Admin reactivates employee session
router.post('/reactivate', authMiddleware, roleMiddleware(['admin', 'super-admin']), reactivateSession);

// Optional: Check session status
router.get('/status', authMiddleware, getMySessionStatus);

module.exports = router;
