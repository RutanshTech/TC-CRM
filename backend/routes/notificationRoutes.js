const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  createNotification,
  getNotificationStats,
  deleteNotification,
  getNotificationsRequiringAction,
  getUnreadCount,
  streamNotifications,
  deleteAllNotifications
} = require('../controllers/notificationController');

// Notification Routes
// Get notifications for current user
router.get('/notifications', authMiddleware, getNotifications);

// Get unread notification count
router.get('/notifications/unread-count', authMiddleware, getUnreadCount);

// Real-time notification stream (SSE)
router.get('/notifications/stream', authMiddleware, streamNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId/read', authMiddleware, markAsRead);

// Mark all notifications as read
router.patch('/notifications/read-all', authMiddleware, markAllAsRead);

// Archive notification
router.patch('/notifications/:notificationId/archive', authMiddleware, archiveNotification);

// Create notification (admin only)
router.post('/notifications', authMiddleware, roleMiddleware(['admin', 'super-admin']), createNotification);

// Get notification statistics
router.get('/notifications/stats', authMiddleware, getNotificationStats);

// Delete notification (users can delete their own notifications)
router.delete('/notifications/:notificationId', authMiddleware, deleteNotification);

// Delete all notifications for current user
router.delete('/notifications/delete-all', authMiddleware, deleteAllNotifications);

// Get notifications requiring action
router.get('/notifications/action-required', authMiddleware, getNotificationsRequiringAction);

module.exports = router; 