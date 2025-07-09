import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Modal component for notification details
const NotificationDetailsModal = ({ notification, onClose }) => {
  if (!notification) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
        <h2 className="text-lg font-semibold mb-2">{notification.title}</h2>
        <p className="mb-2">{notification.message}</p>
        <div className="text-xs text-gray-500 mb-2">Type: {notification.type}</div>
        <div className="text-xs text-gray-500 mb-2">Priority: {notification.priority}</div>
        {notification.requiresAction && (
          <div className="text-xs text-orange-600 mb-2">Action Required: {notification.actionType}</div>
        )}
        {notification.actionDeadline && (
          <div className="text-xs text-orange-600 mb-2">Deadline: {new Date(notification.actionDeadline).toLocaleString()}</div>
        )}
        <div className="text-xs text-gray-400">Created: {new Date(notification.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
};

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [detailsModal, setDetailsModal] = useState(null);
  const [error, setError] = useState(null);
  const prevUnreadCount = useRef(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(response.data.notifications);
      if (typeof response.data.unreadCount === 'number' && response.data.unreadCount > prevUnreadCount.current) {
        toast.success('You have a new notification!');
      }
      setUnreadCount(response.data.unreadCount);
      prevUnreadCount.current = response.data.unreadCount;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;
    if (isOpen) {
      fetchNotifications();
      intervalId = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen]);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const archiveNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/notifications/${notificationId}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
      toast.success('Notification archived');
    } catch (error) {
      toast.error('Failed to archive notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_claim':
        return '💰';
      case 'lead_status':
        return '📊';
      case 'employee_block':
        return '🚫';
      case 'leave_approval':
        return '📅';
      case 'system_alert':
        return '⚠️';
      case 'productivity_alert':
        return '📈';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.readBy?.some(read => read.employee === localStorage.getItem('userId'));
    if (activeTab === 'action') return notification.requiresAction;
    return notification.type === activeTab;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'action', label: 'Action Required' },
            { key: 'payment_claim', label: 'Payments' },
            { key: 'lead_status', label: 'Leads' },
            { key: 'system_alert', label: 'Alerts' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              Loading notifications...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 flex flex-col items-center">
              <svg className="h-8 w-8 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
              {error}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center">
              <svg className="h-8 w-8 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
              No notifications found
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => {
                const isRead = notification.readBy?.some(read => read.employee === localStorage.getItem('userId'));
                return (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium ${
                              !isRead ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                              {notification.requiresAction && (
                                <span className="text-orange-600 font-medium">
                                  Action Required
                                </span>
                              )}
                              {notification.priority !== 'medium' && (
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {notification.priority}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {!isRead && (
                              <button
                                onClick={() => markAsRead(notification._id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => archiveNotification(notification._id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Archive
                            </button>
                          </div>
                        </div>
                        
                        {/* Action Required */}
                        {notification.requiresAction && notification.actionType && (
                          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="text-sm font-medium text-orange-800 mb-2">
                              Action Required: {notification.actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            {notification.actionDeadline && (
                              <div className="text-xs text-orange-600">
                                Deadline: {new Date(notification.actionDeadline).toLocaleString()}
                              </div>
                            )}
                            <div className="mt-2 flex gap-2">
                              <button
                                className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                                onClick={() => {
                                  toast('Action performed (placeholder)!');
                                }}
                              >
                                Take Action
                              </button>
                              <button
                                className="text-xs text-orange-600 hover:text-orange-800"
                                onClick={() => setDetailsModal(notification)}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                // Refresh notifications
                fetchNotifications();
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      {/* Notification Details Modal */}
      <NotificationDetailsModal notification={detailsModal} onClose={() => setDetailsModal(null)} />
    </div>
  );
};

export default NotificationCenter; 