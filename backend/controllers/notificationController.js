const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const PaymentCollection = require('../models/PaymentCollection');

// Get notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    
    let query = {
      $or: [
        { recipients: req.user.id },
        { allEmployees: true }
      ]
    };
    
    // Type filter
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name')
      .populate('recipients', 'name employeeId')
      .populate('readBy.employee', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    
    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      $or: [
        { recipients: req.user.id },
        { allEmployees: true }
      ],
      'readBy.employee': { $ne: req.user.id }
    });
    
    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      },
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user is a recipient
    const isRecipient = notification.recipients.includes(req.user.id) || notification.allEmployees;
    if (!isRecipient) {
      return res.status(403).json({ message: 'You are not authorized to read this notification' });
    }
    
    await notification.markAsRead(req.user.id);
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipients: req.user.id },
        { allEmployees: true }
      ],
      'readBy.employee': { $ne: req.user.id }
    });
    
    for (const notification of notifications) {
      await notification.markAsRead(req.user.id);
    }
    
    res.json({ message: 'All notifications marked as read', count: notifications.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notifications as read', error: error.message });
  }
};

// Archive notification
exports.archiveNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user is a recipient
    const isRecipient = notification.recipients.includes(req.user.id) || notification.allEmployees;
    if (!isRecipient) {
      return res.status(403).json({ message: 'You are not authorized to archive this notification' });
    }
    
    await notification.archiveNotification();
    
    res.json({ message: 'Notification archived', notification });
  } catch (error) {
    res.status(500).json({ message: 'Failed to archive notification', error: error.message });
  }
};

// Create notification (admin only)
exports.createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      priority,
      recipients,
      allEmployees,
      requiresAction,
      actionType,
      actionDeadline
    } = req.body;

    const notificationData = {
      title,
      message,
      type,
      priority: priority || 'medium',
      sender: req.user.id,
      requiresAction: requiresAction || false,
      actionType,
      actionDeadline: actionDeadline ? new Date(actionDeadline) : null
    };

    if (allEmployees) {
      notificationData.allEmployees = true;
    } else if (recipients && recipients.length > 0) {
      notificationData.recipients = recipients;
    } else {
      return res.status(400).json({ message: 'Either recipients or allEmployees must be specified' });
    }

    const notification = await Notification.create(notificationData);
    
    // Send notification immediately
    await notification.sendNotification();
    
    res.status(201).json({ 
      message: 'Notification created and sent successfully',
      notification
    });
  } catch (error) {
    res.status(500).json({ message: 'Notification creation failed', error: error.message });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $match: {
          $or: [
            { recipients: req.user.id },
            { allEmployees: true }
          ]
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                { $not: { $in: [req.user.id, '$readBy.employee'] } },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const totalStats = await Notification.aggregate([
      {
        $match: {
          $or: [
            { recipients: req.user.id },
            { allEmployees: true }
          ]
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: {
              $cond: [
                { $not: { $in: [req.user.id, '$readBy.employee'] } },
                1,
                0
              ]
            }
          },
          requiresAction: {
            $sum: {
              $cond: ['$requiresAction', 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      byType: stats,
      total: totalStats[0] || { total: 0, unread: 0, requiresAction: 0 }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notification stats', error: error.message });
  }
};

// Send payment claim notification (triggered by payment creation)
exports.sendPaymentClaimNotification = async (paymentData) => {
  try {
    // Get all employees with sales access
    const salesEmployees = await Employee.find({ 
      'access.sales': true, 
      isActive: true 
    }).select('_id');

    if (salesEmployees.length > 0) {
      const notification = await Notification.createPaymentClaimNotification(
        paymentData, 
        salesEmployees.map(emp => emp._id)
      );
      
      await notification.sendNotification();
      return notification;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to send payment claim notification:', error);
    return null;
  }
};

// Send productivity alert notification
exports.sendProductivityAlert = async (employeeId, message) => {
  try {
    const notification = await Notification.createProductivityAlert(employeeId, message);
    await notification.sendNotification();
    return notification;
  } catch (error) {
    console.error('Failed to send productivity alert:', error);
    return null;
  }
};

// Send lead status notification
exports.sendLeadStatusNotification = async (leadData, recipients) => {
  try {
    const notification = await Notification.createLeadStatusNotification(leadData, recipients);
    await notification.sendNotification();
    return notification;
  } catch (error) {
    console.error('Failed to send lead status notification:', error);
    return null;
  }
};

// Delete notification (users can delete their own notifications)
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    
    const notification = await Notification.findById(notificationId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user is authorized to delete this notification
    const isRecipient = notification.recipients && notification.recipients.includes(userId);
    const isAllEmployees = notification.allEmployees === true;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super-admin';
    
    if (!isRecipient && !isAllEmployees && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this notification' });
    }
    
    await Notification.findByIdAndDelete(notificationId);
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification', error: error.message });
  }
};

// Delete all notifications for current user
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete all notifications for the current user
    const result = await Notification.deleteMany({
      $or: [
        { recipients: userId },
        { allEmployees: true }
      ]
    });
    
    res.json({ 
      message: 'All notifications deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete all notifications', error: error.message });
  }
};

// Get notifications requiring action
exports.getNotificationsRequiringAction = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const query = {
      $or: [
        { recipients: req.user.id },
        { allEmployees: true }
      ],
      requiresAction: true,
      actionDeadline: { $gte: new Date() } // Only future deadlines
    };
    
    const skip = (page - 1) * limit;
    
    const notifications = await Notification.find(query)
      .populate('sender', 'name')
      .populate('recipients', 'name employeeId')
      .sort({ actionDeadline: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications requiring action', error: error.message });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    console.log('DEBUG getUnreadCount for user:', req.user && req.user.id, typeof req.user && req.user.id);
    const userId = req.user && req.user.id ? req.user.id.toString() : null;
    if (!userId) {
      return res.status(400).json({ message: 'No user id found in request.' });
    }
    const unreadCount = await Notification.countDocuments({
      $or: [
        { recipients: userId },
        { allEmployees: true }
      ],
      'readBy.employee': { $ne: userId }
    });
    res.json({ unreadCount });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    res.status(500).json({ message: 'Failed to get unread count', error: error.message });
  }
}; 

// Server-Sent Events endpoint for real-time notifications
exports.streamNotifications = async (req, res) => {
  try {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write('data: {"type": "connected", "message": "Connected to notification stream"}\n\n');

    // Store the response object for later use
    const userId = req.user.id;
    if (!global.notificationStreams) {
      global.notificationStreams = new Map();
    }
    global.notificationStreams.set(userId, res);

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatInterval);
        return;
      }
      res.write('data: {"type": "heartbeat", "timestamp": "' + new Date().toISOString() + '"}\n\n');
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      global.notificationStreams.delete(userId);
      console.log(`Client ${userId} disconnected from notification stream`);
    });

    // Handle client disconnect on error
    req.on('error', (error) => {
      console.error('SSE connection error:', error);
      clearInterval(heartbeatInterval);
      global.notificationStreams.delete(userId);
    });

  } catch (error) {
    console.error('Error setting up SSE connection:', error);
    res.status(500).end();
  }
};

// Function to send notification to specific user via SSE
exports.sendNotificationToUser = async (userId, notification) => {
  try {
    if (global.notificationStreams && global.notificationStreams.has(userId)) {
      const res = global.notificationStreams.get(userId);
      if (res && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'notification',
          notification: notification
        })}\n\n`);
        return true;
      } else {
        // Clean up dead connection
        global.notificationStreams.delete(userId);
      }
    }
    return false;
  } catch (error) {
    console.error('Error sending notification via SSE:', error);
    return false;
  }
};

// Function to broadcast notification to multiple users
exports.broadcastNotification = async (userIds, notification) => {
  try {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotificationToUser(userId, notification))
    );
    
    const successCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
    console.log(`Broadcasted notification to ${successCount}/${userIds.length} users`);
    
    return successCount;
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return 0;
  }
}; 