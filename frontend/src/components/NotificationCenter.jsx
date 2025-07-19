import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import notificationSound from '../utils/notificationSound';

// Modal component for notification details
const NotificationDetailsModal = ({ notification, onClose }) => {
  if (!notification) return null;
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAdditionalInfo = () => {
    if (!notification.relatedData) return null;

    const { relatedData } = notification;
    
    switch (notification.type) {
      case 'lead_assignment':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-semibold text-blue-800">Assignment Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Assigned by:</span>
                <span className="font-medium text-blue-800">{notification.sender?.name || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Assigned at:</span>
                <span className="font-medium text-blue-800">{formatDate(notification.createdAt)}</span>
              </div>
              {relatedData.leadId && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Lead ID:</span>
                  <span className="font-medium text-blue-800">{relatedData.leadId}</span>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'payment_created':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-semibold text-green-800">Payment Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-600">Amount:</span>
                <span className="font-bold text-green-800">₹{relatedData.paymentAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Created by:</span>
                <span className="font-medium text-green-800">{notification.sender?.name || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Created at:</span>
                <span className="font-medium text-green-800">{formatDate(notification.createdAt)}</span>
              </div>
              {relatedData.leadId && (
                <div className="flex justify-between">
                  <span className="text-green-600">Lead ID:</span>
                  <span className="font-medium text-green-800">{relatedData.leadId}</span>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'access_granted':
        // Show all access types if multiple are present
        let accessTypes = [];
        if (relatedData.access) {
          if (relatedData.access.leadAdd) accessTypes.push('LeadAdd');
          if (relatedData.access.operation) accessTypes.push('Operation');
          if (relatedData.access.copy) accessTypes.push('Copy');
          if (relatedData.access.sales) accessTypes.push('Sales');
          if (relatedData.access.advocate) accessTypes.push('Advocate');
        }
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-semibold text-purple-800">Access Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-600">Access Type:</span>
                <span className="font-bold text-purple-800 capitalize">
                  {accessTypes.length > 0
                    ? accessTypes.map(type => (
                        <span key={type} className="inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs mr-1">{type}</span>
                      ))
                    : (relatedData.accessType || '-')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Granted by:</span>
                <span className="font-medium text-purple-800">{notification.sender?.name || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Granted at:</span>
                <span className="font-medium text-purple-800">{formatDate(notification.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      
      case 'leave_response':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-semibold text-orange-800">Leave Response Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-orange-600">Response:</span>
                <span className={`font-bold capitalize ${
                  relatedData.leaveResponse === 'approved' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {relatedData.leaveResponse}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Responded by:</span>
                <span className="font-medium text-orange-800">{notification.sender?.name || 'Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Responded at:</span>
                <span className="font-medium text-orange-800">{formatDate(notification.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      
      case 'payment_claim':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-semibold text-yellow-800">Payment Claim Details</span>
            </div>
            <div className="space-y-1 text-sm">
              {relatedData.leadId && (
                <div className="flex justify-between">
                  <span className="text-yellow-600">Lead ID:</span>
                  <span className="font-medium text-yellow-800">{relatedData.leadId}</span>
                </div>
              )}
              {notification.actionDeadline && (
                <div className="flex justify-between">
                  <span className="text-yellow-600">Claim Deadline:</span>
                  <span className="font-medium text-yellow-800">{formatDate(notification.actionDeadline)}</span>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'admin_access_granted':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-semibold text-purple-800">Admin Access Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-600">Access Type:</span>
                <span className="font-bold text-purple-800 capitalize">{relatedData.adminAccessType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Granted by:</span>
                <span className="font-medium text-purple-800">{notification.sender?.name || 'Super Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Granted at:</span>
                <span className="font-medium text-purple-800">{formatDate(notification.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      
      case 'admin_password_changed':
        return (
          <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-semibold text-red-800">Password Change Details</span>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-red-600">Changed by:</span>
                <span className="font-medium text-red-800">{notification.sender?.name || 'Super Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">Changed at:</span>
                <span className="font-medium text-red-800">{formatDate(notification.createdAt)}</span>
              </div>
              <div className="mt-2 p-2 bg-red-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="text-xs font-medium text-red-700">
                    Please contact super admin if this was not authorized
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">{notification.title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">{notification.message}</p>
          </div>
          
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium text-gray-700 capitalize">{notification.type.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Priority:</span>
              <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                notification.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                notification.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {notification.priority}
              </span>
            </div>
          </div>
          
          {notification.requiresAction && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-orange-600">⚡</span>
                <span className="text-sm font-medium text-orange-800">
                  Action Required: {notification.actionType}
                </span>
              </div>
              {notification.actionDeadline && (
                <div className="mt-1 text-xs text-orange-600">
                  Deadline: {formatDate(notification.actionDeadline)}
                </div>
              )}
            </div>
          )}
          
          {renderAdditionalInfo()}
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Created: {formatDate(notification.createdAt)}
            </div>
          </div>
        </div>
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevUnreadCount = useRef(0);
  const prevNotificationsLength = useRef(0);

  // Load sound settings
  useEffect(() => {
    const enabled = localStorage.getItem('notificationSoundEnabled');
    if (enabled !== null) {
      setSoundEnabled(enabled === 'true');
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newNotifications = response.data.notifications;
      const newUnreadCount = response.data.unreadCount;

      // Check for new notifications
      if (newNotifications.length > prevNotificationsLength.current) {
        const newNotificationsCount = newNotifications.length - prevNotificationsLength.current;
        
        // Play sound for new notifications
        if (soundEnabled && newNotificationsCount > 0) {
          notificationSound.playNotificationSound();
        }
        
        // Show toast for new notifications (without sound)
        if (newNotificationsCount > 0) {
          toast.success(`You have ${newNotificationsCount} new notification${newNotificationsCount > 1 ? 's' : ''}!`, {
            duration: 3001,
            icon: '🔔'
          });
        }
      }

      // Check for new unread notifications
      if (newUnreadCount > prevUnreadCount.current) {
        const newUnreadCountDiff = newUnreadCount - prevUnreadCount.current;
        
        // Play sound for new unread notifications
        if (soundEnabled && newUnreadCountDiff > 0) {
          notificationSound.playNotificationSound();
        }
      }

      setNotifications(newNotifications);
      setUnreadCount(newUnreadCount);
      prevUnreadCount.current = newUnreadCount;
      prevNotificationsLength.current = newNotifications.length;
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
      // Poll every 10 seconds for new notifications
      intervalId = setInterval(fetchNotifications, 10000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, soundEnabled]);

  const toggleSound = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    notificationSound.setEnabled(newEnabled);
    // Show visual feedback without sound
    toast.success(`Notification sound ${newEnabled ? 'enabled' : 'disabled'}`, {
      duration: 2000,
      icon: newEnabled ? '🔊' : '🔇'
    });
  };

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

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const deleteAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/notifications/delete-all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchNotifications();
      toast.success('All notifications deleted');
    } catch (error) {
      toast.error('Failed to delete all notifications');
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
      case 'lead_assignment':
        return '🎯';
      case 'payment_created':
        return '💳';
      case 'access_granted':
        return '🔓';
      case 'leave_response':
        return '📋';
      case 'admin_access_granted':
        return '👑';
      case 'admin_password_changed':
        return '🔐';
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

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'payment_claim':
        return 'Payment Claim';
      case 'lead_status':
        return 'Lead Status';
      case 'employee_block':
        return 'Employee Block';
      case 'leave_approval':
        return 'Leave Approval';
      case 'system_alert':
        return 'System Alert';
      case 'productivity_alert':
        return 'Productivity Alert';
      case 'lead_assignment':
        return 'Lead Assignment';
      case 'payment_created':
        return 'Payment Created';
      case 'access_granted':
        return 'Access Granted';
      case 'leave_response':
        return 'Leave Response';
      case 'admin_access_granted':
        return 'Admin Access Granted';
      case 'admin_password_changed':
        return 'Password Changed';
      default:
        return 'Notification';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.readBy?.some(read => read.employee === notification.recipients?.[0]);
    if (activeTab === 'urgent') return notification.priority === 'urgent';
    if (activeTab === 'action') return notification.requiresAction;
    return notification.type === activeTab;
  });

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-xl">🔔</span>
                </div>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">Notifications</h2>
                <p className="text-blue-100 text-sm">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={toggleSound}
                className={`p-2 rounded-full transition-all ${
                  soundEnabled 
                    ? 'bg-white bg-opacity-20 text-white hover:bg-opacity-30' 
                    : 'bg-white bg-opacity-10 text-blue-100 hover:bg-opacity-20'
                }`}
                title={soundEnabled ? 'Disable notification sound' : 'Enable notification sound (plays for new notifications)'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-100 hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={deleteAllNotifications}
                className="text-sm text-blue-100 hover:text-white transition-colors"
                title="Delete all notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'urgent', label: 'Urgent', count: notifications.filter(n => n.priority === 'urgent').length },
              { key: 'action', label: 'Action', count: notifications.filter(n => n.requiresAction).length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchNotifications}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 mb-2">📭</div>
              <p className="text-gray-500">No notifications found</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredNotifications.map((notification) => {
                const isUnread = !notification.readBy?.some(read => 
                  read.employee === notification.recipients?.[0]
                );
                
                return (
                  <div
                    key={notification._id}
                    className={`bg-white rounded-xl border-2 transition-all hover:shadow-md ${
                      isUnread ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className={`font-semibold text-gray-900 ${
                                isUnread ? 'font-bold' : ''
                              }`}>
                                {notification.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isUnread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                notification.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                notification.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {notification.priority}
                              </span>
                              
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {getNotificationTypeLabel(notification.type)}
                              </span>
                              
                              {notification.requiresAction && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                  ⚡ Action
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal(notification);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification._id);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete notification"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {detailsModal && (
        <NotificationDetailsModal
          notification={detailsModal}
          onClose={() => setDetailsModal(null)}
        />
      )}
    </>
  );
};

export default NotificationCenter; 