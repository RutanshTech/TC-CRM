import { Bell, Search, User } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import NotificationCenter from "./NotificationCenter";

const Header = ({ sidebarCollapsed = false }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30010);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 right-0 bg-white border-b border-gray-200 shadow-sm z-40 transition-all duration-300`}
        style={{ left: sidebarCollapsed ? 48 : 176 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent w-48 text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => setShowNotifications(true)}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={12} className="text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-800">{JSON.parse(localStorage.getItem('user'))?.name || 'User'}</span>
                <span className="text-xs text-gray-500">
                  {(() => {
                    const role = JSON.parse(localStorage.getItem('user'))?.role;
                    if (role === 'super-admin') return 'Super Admin';
                    if (role === 'admin') return 'Admin';
                    if (role === 'employee') return 'Employee';
                    if (role === 'operation') return 'Operation';
                    if (role === 'advocate') return 'Advocate';
                    return 'User';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};

export default Header;
  