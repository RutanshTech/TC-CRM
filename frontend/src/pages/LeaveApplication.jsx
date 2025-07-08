import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const LeaveApplication = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [overlapError, setOverlapError] = useState('');

  const fetchLeaveHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user'));
      
      console.log('Fetching leave history for employee:', userData?.employeeId);
      
      const response = await axios.get(
        `http://localhost:3000/api/employees/${userData.employeeId}/leaves`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Leave history response:', response.data);
      setLeaveHistory(response.data.leaves || []);
    } catch (error) {
      console.error('Failed to fetch leave history:', error);
      console.error('Error response:', error.response?.data);
    }
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    const userRole = localStorage.getItem('userRole');
    
    // Redirect admin and super-admin away from this page
    if (userRole === 'admin' || userRole === 'super-admin') {
      navigate('/');
      return;
    }
    
    setUser(userData);
    if (userData && userData.employeeId) {
      fetchLeaveHistory();
    }
  }, [navigate, fetchLeaveHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOverlapError('');
    
    let parsedUser = null;
    try {
      parsedUser = JSON.parse(localStorage.getItem('user'));
    } catch (err) {
      console.error('Failed to parse user from localStorage:', err);
    }
    console.log('Parsed user:', parsedUser);
    console.log('Current user state:', user);
    console.log('Current formData:', formData);

    if (!parsedUser || !parsedUser.employeeId) {
      toast.error('User information not found in localStorage. Please login again.');
      console.error('User information not found in localStorage.');
      return;
    }
    if (!user || !user.employeeId) {
      toast.error('User information not found in React state. Please login again.');
      console.error('User information not found in React state.');
      return;
    }
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      toast.error('Please fill in all fields');
      console.error('Form validation failed: missing fields', formData);
      return;
    }
    // Validate dates
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    // Fix: compare only date part (ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    console.log('Start date:', start, 'End date:', end, 'Today:', today);
    if (start >= end) {
      toast.error('End date must be after start date');
      console.error('Date validation failed: start >= end');
      return;
    }
    if (start < today) {
      toast.error('Start date cannot be in the past');
      console.error('Date validation failed: start < today');
      return;
    }
    setLoading(true);
    try {
      console.log('Submitting leave application:', {
        employeeId: user.employeeId,
        formData,
        token: localStorage.getItem('token') ? 'Present' : 'Missing'
      });
      const response = await axios.post(
        `http://localhost:3000/api/employees/${user.employeeId}/leave`,
        formData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      console.log('Response received:', response.data);
      toast.success('Leave application submitted successfully! Admin will review it soon.');
      setFormData({ startDate: '', endDate: '', reason: '' });
      setOverlapError('');
      fetchLeaveHistory();
    } catch (error) {
      console.error('Leave application submission error:', error);
      console.error('Error response:', error.response?.data);
      // Custom message for overlapping leave
      if (error.response?.data?.message === 'You already have a pending or approved leave application that overlaps with this period') {
        setOverlapError('You already have a pending or approved leave application that overlaps with this period');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit leave application');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `http://localhost:3000/api/employees/${user.employeeId}/leave/${leaveId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Leave application cancelled successfully');
      fetchLeaveHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel leave application');
    }
  };

  const getLeaveStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className={`flex-1 transition-margin duration-300 mt-16 ${sidebarCollapsed ? 'ml-16' : 'ml-48'}`}>
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'pl-4' : 'pl-0'}`}>
        <Header title="Leave Application" sidebarCollapsed={sidebarCollapsed} />
      </div>
      
      <div className={`p-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'pl-4' : 'pl-0'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Leave Application</h1>
                <p className="text-gray-600 mt-1">
                  Welcome, {user?.name}! Submit your leave request here. Admin will review and approve it.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Leave Application Form */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Apply for Leave
              </h2>
              {overlapError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {overlapError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => { setFormData(prev => ({ ...prev, startDate: e.target.value })); setOverlapError(''); }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => { setFormData(prev => ({ ...prev, endDate: e.target.value })); setOverlapError(''); }}
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                  {formData.startDate && formData.endDate && (
                    <p className="text-sm text-gray-500 mt-1">
                      Duration: {calculateDays(formData.startDate, formData.endDate)} days
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Leave <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => { setFormData(prev => ({ ...prev, reason: e.target.value })); setOverlapError(''); }}
                    rows={4}
                    placeholder="Please provide a detailed reason for your leave request..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    required
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Important Information</p>
                      <ul className="text-xs text-blue-600 mt-1 space-y-1">
                        <li>• Your leave application will be reviewed by admin/super-admin</li>
                        <li>• You will be notified once it's approved or rejected</li>
                        <li>• During approved leave, you won't be auto-blocked for inactivity</li>
                        <li>• You can cancel pending applications anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Leave Application'
                  )}
                </button>
              </form>
            </div>

            {/* Leave History */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Leave History
                </h2>
                <button
                  onClick={fetchLeaveHistory}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Refresh
                </button>
              </div>

              {console.log('Current leaveHistory state:', leaveHistory)}
              {leaveHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Applications</h3>
                  <p className="text-gray-500">You haven't submitted any leave applications yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {leaveHistory.map((leave) => (
                    <div key={leave._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {calculateDays(leave.startDate, leave.endDate)} days
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLeaveStatusColor(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-3">
                        <strong>Reason:</strong> {leave.reason}
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-3">
                        Applied: {formatDate(leave.createdAt)}
                      </div>
                      
                      {leave.status === 'pending' && (
                        <button
                          onClick={() => handleCancelLeave(leave._id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Cancel Application
                        </button>
                      )}
                      
                      {leave.status === 'rejected' && leave.notes && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          <strong>Admin Note:</strong> {leave.notes}
                        </div>
                      )}
                      
                      {leave.status === 'approved' && (
                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                          ✓ Leave approved! You won't be auto-blocked during this period.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApplication; 