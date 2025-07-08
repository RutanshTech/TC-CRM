import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardCards from '../components/DashboardCards';
import Header from '../components/Header';

// Presence hook for employees
function usePresence(employeeId) {
  useEffect(() => {
    if (!employeeId) return;
    const token = localStorage.getItem('token');
    
    // Set online on mount
    axios.patch(
      'http://localhost:3000/api/employees/status',
      { status: 'online' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Heartbeat every 2 min
    const interval = setInterval(() => {
      axios.patch(
        'http://localhost:3000/api/employees/status',
        { status: 'online' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }, 2 * 60 * 1000);

    // Set offline on tab close
    const handleOffline = () => {
      navigator.sendBeacon(
        'http://localhost:3000/api/employees/status',
        JSON.stringify({ status: 'offline' })
      );
    };
    window.addEventListener('beforeunload', handleOffline);

    return () => {
      clearInterval(interval);
      handleOffline();
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [employeeId]);
}

const Dashboard = ({ sidebarCollapsed }) => {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeLeads: 0,
    completedLeads: 0,
    todayFollowUps: 0
  });

  // FIX: Call usePresence at the top-level
  const user = JSON.parse(localStorage.getItem('user'));
  const employeeId = user && user.role === 'employee' ? user.employeeId : null;
  usePresence(employeeId);

  useEffect(() => {
    // Fetch dashboard stats
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div 
        className={`pt-16 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-12' : 'ml-48'
        }`}
      >
        <div className="p-4">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Welcome back! Here's your overview.</p>
          </div>
          
          <DashboardCards stats={stats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">New lead added</span>
                  <span className="text-xs text-gray-400">2 min ago</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Follow-up completed</span>
                  <span className="text-xs text-gray-400">15 min ago</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Call logged</span>
                  <span className="text-xs text-gray-400">1 hour ago</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors">
                  Add New Lead
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors">
                  Schedule Follow-up
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors">
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
