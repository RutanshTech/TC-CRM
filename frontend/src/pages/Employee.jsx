import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';
import LeadModal from '../components/LeadModal';

function usePresence(employeeId) {
  useEffect(() => {
    if (!employeeId) return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Determine the correct endpoint based on user role
    const endpoint = user.role === 'employee' 
      ? 'https://tc-crm.vercel.app/api/employees/status'
      : `https://tc-crm.vercel.app/api/employees/${employeeId}/status`;
    
    // Set online on mount
    axios.patch(
      endpoint,
      { status: 'online' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Heartbeat every 2 min
    const interval = setInterval(() => {
      axios.patch(
        endpoint,
        { status: 'online' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }, 2 * 60 * 1000);

    // Set offline on tab close
    const handleOffline = () => {
      const offlineData = JSON.stringify({ status: 'offline' });
      if (user.role === 'employee') {
        // For employees, use the new endpoint
        navigator.sendBeacon(
          'https://tc-crm.vercel.app/api/employees/status',
          offlineData
        );
      } else {
        // For admins, use the old endpoint
        navigator.sendBeacon(
          `https://tc-crm.vercel.app/api/employees/${employeeId}/status`,
          offlineData
        );
      }
    };
    window.addEventListener('beforeunload', handleOffline);

    return () => {
      clearInterval(interval);
      handleOffline();
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [employeeId]);
}

const Employee = ({ sidebarCollapsed }) => {
  // Main states
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [productivityFilter, setProductivityFilter] = useState('daily');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    productivity: 'daily'
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalRecords: 0
  });

  // Employee form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    personalMobile: '',
    companyMobile: '',
    referenceMobile: '',
    personalEmail: '',
    companyEmail: '',
    dateOfBirth: '',
    aadharCard: '',
    panCard: '',
    bankDetails: {
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountHolderName: '',
      upiId: ''
    },
    joinedThrough: '',
    additionalNotes: '',
    access: {
      sales: false,
      operation: false,
      advocate: false,
      leadAdd: false,
      copy: false
    }
  });

  // Super Admin option to create without access
  const [createWithoutAccess, setCreateWithoutAccess] = useState(false);
  const [userRole, setUserRole] = useState('');

  // Lead distribution states
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showDuplicateLeads, setShowDuplicateLeads] = useState(false);
  const [showAssignedLeads, setShowAssignedLeads] = useState(false);

  // Approval states
  const [approvals, setApprovals] = useState({
    leaveApplications: [],
    blockRequests: [],
    loginRequests: []
  });

  // Payment states
  const [payments, setPayments] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [claimedPayments, setClaimedPayments] = useState([]);

  // Assigned leads
  const [assignedLeads, setAssignedLeads] = useState([]);

  // New state for selected employee leads
  const [selectedEmployeeLeads, setSelectedEmployeeLeads] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Add a live clock state
  const [liveTime, setLiveTime] = useState(new Date());
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  // Replace addLeadState with an array of leadRows
  const [leadRows, setLeadRows] = useState([{ mobileNumber: '', brandName: '', additionalNotes: '' }]);
  const [addLeadSubmitting, setAddLeadSubmitting] = useState(false);

  // State for Lead Distribution modal
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [distributionLeads, setDistributionLeads] = useState([]); // available leads
  const [distributionEmployees, setDistributionEmployees] = useState([]); // employees
  const [selectedDistributionLeads, setSelectedDistributionLeads] = useState([]);
  const [selectedDistributionEmployees, setSelectedDistributionEmployees] = useState([]);
  const [distributionLoading, setDistributionLoading] = useState(false);



  useEffect(() => {
    fetchEmployees();
    if (activeTab === 'leads' && (userRole === 'admin' || userRole === 'super-admin')) fetchLeads();
    if (activeTab === 'approvals' && (userRole === 'admin' || userRole === 'super-admin')) {
      fetchApprovals();
      fetchLeaveApplications();
    }
    if (activeTab === 'payments') fetchPayments();
    if (activeTab === 'assignedLeads') fetchAssignedLeads();
  }, [filters, pagination.current, activeTab, userRole]);

  // Redirect to employees tab if user doesn't have access to current tab
  useEffect(() => {
    if (userRole && userRole !== 'admin' && userRole !== 'super-admin') {
      if (['leads', 'assignedLeads', 'approvals'].includes(activeTab)) {
        setActiveTab('employees');
      }
    }
  }, [userRole, activeTab]);

  // Real-time status updates for admins
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    // Only set up real-time updates for admin/super-admin
    if (user && ['admin', 'super-admin'].includes(user.role)) {
      // Poll for status updates every 30 seconds
      const statusInterval = setInterval(() => {
        fetchEmployees();
      }, 30000); // 30 seconds

      // Socket.io setup
      const socket = io('https://tc-crm.vercel.app');
      socket.on('employeeStatusUpdate', () => {
        fetchEmployees();
      });

      return () => {
        clearInterval(statusInterval);
        socket.disconnect();
      };
    }
  }, []);

  // Fetch employees with productivity data
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        ...filters,
        productivity: productivityFilter,
        ...(productivityFilter === 'custom' && customDateRange.start && customDateRange.end && {
          startDate: customDateRange.start,
          endDate: customDateRange.end
        })
      });

      const res = await axios.get(`https://tc-crm.vercel.app/api/employees?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Employees from API:', res.data.employees);
      setEmployees(res.data.employees);
      setUserRole(res.data.userRole);
      setPagination({
        current: res.data.pagination.current,
        total: res.data.pagination.total,
        totalRecords: res.data.pagination.totalRecords
      });
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching employees');
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads for distribution
  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Check if user has permission
      if (!user || !['admin', 'super-admin'].includes(user.role)) {
        toast.error('Access denied. You do not have permission to view leads for distribution.');
        return;
      }
      
      const res = await axios.get('https://tc-crm.vercel.app/api/leads/distribution', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Leads from API:', res.data.leads);
      setLeads(res.data.leads || []);
    } catch (err) {
      console.error('Error fetching leads for distribution:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (err.response?.status === 403) {
        toast.error('Access denied. You do not have permission to view leads for distribution.');
      } else if (err.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(
          err.response?.data?.message || err.message || 'Failed to fetch leads for distribution'
        );
      }
    }
  };

  // Fetch approvals
  const fetchApprovals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://tc-crm.vercel.app/api/approvals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApprovals(res.data);
    } catch (err) {
      toast.error('Error fetching approvals');
    }
  };

  // Fetch leave applications for admin/super-admin
  const fetchLeaveApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://tc-crm.vercel.app/api/employees/leaves/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApprovals(prev => ({
        ...prev,
        leaveApplications: res.data.leaves || []
      }));
    } catch (err) {
      console.error('Error fetching leave applications:', err);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://tc-crm.vercel.app/api/payments/entries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data.payments);
      setClaimedPayments(res.data.claimed);
    } catch (err) {
      toast.error('Error fetching payments');
    }
  };

  // Fetch assigned leads
  const fetchAssignedLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://tc-crm.vercel.app/api/leads/assigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignedLeads(res.data.assignedLeads);
    } catch (err) {
      console.error('Assigned Leads Error:', err.response?.data || err.message || err);
      toast.error(err.response?.data?.message || err.message || 'Error fetching assigned leads');
    }
  };

  // Employee management functions
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      password: '',
      personalMobile: employee.personalMobile || '',
      companyMobile: employee.companyMobile || '',
      referenceMobile: employee.referenceMobile || '',
      personalEmail: employee.personalEmail || '',
      companyEmail: employee.companyEmail || '',
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      aadharCard: employee.aadharCard || '',
      panCard: employee.panCard || '',
      bankDetails: {
        accountNumber: employee.bankDetails?.accountNumber || '',
        ifscCode: employee.bankDetails?.ifscCode || '',
        bankName: employee.bankDetails?.bankName || '',
        accountHolderName: employee.bankDetails?.accountHolderName || '',
        upiId: employee.bankDetails?.upiId || ''
      },
      joinedThrough: employee.joinedThrough || '',
      additionalNotes: employee.additionalNotes || '',
      access: {
        sales: employee.access?.sales || false,
        operation: employee.access?.operation || false,
        advocate: employee.access?.advocate || false,
        leadAdd: employee.access?.leadAdd || false,
        copy: employee.access?.copy || false
      }
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      personalMobile: '',
      companyMobile: '',
      referenceMobile: '',
      personalEmail: '',
      companyEmail: '',
      dateOfBirth: '',
      aadharCard: '',
      panCard: '',
      bankDetails: {
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        accountHolderName: '',
        upiId: ''
      },
      joinedThrough: '',
      additionalNotes: '',
      access: {
        sales: false,
        operation: false,
        advocate: false,
        leadAdd: false,
        copy: false
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (editingEmployee) {
        await axios.put(
          `https://tc-crm.vercel.app/api/employees/${editingEmployee.employeeId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Employee updated successfully');
      } else {
        // Prepare the request data - remove userRole as it's not needed
        const requestData = {
          ...formData,
          createWithoutAccess
        };
        
        console.log('Sending employee creation request:', requestData);
        
        const response = await axios.post(
          'https://tc-crm.vercel.app/api/employees',
          requestData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Employee creation response:', response.data);
        toast.success('Employee created successfully');
      }
      
      setIsModalOpen(false);
      resetForm();
      setCreateWithoutAccess(false); // Reset the checkbox
      fetchEmployees();
    } catch (err) {
      console.error('Employee creation error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        if (err.response.data?.errors && Array.isArray(err.response.data.errors)) {
          err.response.data.errors.forEach(error => {
            toast.error(error);
          });
        } else if (err.response.data?.message) {
          toast.error(err.response.data.message);
        } else {
          toast.error('Operation failed');
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error('No response received:', err.request);
        toast.error('No response from server. Please check your connection or try again later.');
      } else {
        // Something else happened
        console.error('Error', err.message);
        toast.error('Network error or server not reachable.');
      }
    }
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://tc-crm.vercel.app/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // State for block/unblock modals
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showAccessControlModal, setShowAccessControlModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [unblockReason, setUnblockReason] = useState('');
  const [accessControlData, setAccessControlData] = useState({
    sales: false,
    operation: false,
    advocate: false,
    leadAdd: false,
    copy: false
  });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Block employee with reason
  const handleBlockEmployee = async () => {
    if (!blockReason.trim()) {
      toast.error('Please enter a reason for blocking');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/block`,
        { reason: blockReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Employee blocked successfully');
      setShowBlockModal(false);
      setBlockReason('');
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Blocking failed');
    }
  };

  // Unblock employee with reason
  const handleUnblockEmployee = async () => {
    if (!unblockReason.trim()) {
      toast.error('Please enter a reason for unblocking');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/unblock`,
        { reason: unblockReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Employee unblocked successfully');
      setShowUnblockModal(false);
      setUnblockReason('');
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unblocking failed');
    }
  };

  // Open block modal
  const openBlockModal = (employee) => {
    setSelectedEmployee(employee);
    setBlockReason('');
    setShowBlockModal(true);
  };

  // Open unblock modal
  const openUnblockModal = (employee) => {
    setSelectedEmployee(employee);
    setUnblockReason('');
    setShowUnblockModal(true);
  };

  // Handle access control update
  const handleAccessControlUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/access`,
        { access: accessControlData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Access permissions updated successfully');
      setShowAccessControlModal(false);
      setSelectedEmployee(null);
      setAccessControlData({
        sales: false,
        operation: false,
        advocate: false,
        leadAdd: false,
        copy: false
      });
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Access control update failed');
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.patch(
        `https://tc-crm.vercel.app/api/employees/${selectedEmployee.employeeId}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Password reset successfully. New password: ${response.data.newPassword}`);
      setShowResetPasswordModal(false);
      setSelectedEmployee(null);
      setResetPasswordLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
      setResetPasswordLoading(false);
    }
  };

  // Open access control modal
  const openAccessControlModal = (employee) => {
    setSelectedEmployee(employee);
    setAccessControlData(employee.access || {
      sales: false,
      operation: false,
      advocate: false,
      leadAdd: false,
      copy: false
    });
    setShowAccessControlModal(true);
  };

  // Open reset password modal
  const openResetPasswordModal = (employee) => {
    setSelectedEmployee(employee);
    setShowResetPasswordModal(true);
  };



  // Status color coding
  const getStatusColor = (status, isBlocked) => {
    if (isBlocked) return 'bg-red-100 text-red-800';
    
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      case 'blocked':
        return 'Blocked';
      case 'on_leave':
        return 'On Leave';
      default:
        return 'Unknown';
    }
  };

  // Lead distribution functions
  const handleLeadDistribution = async () => {
    if (selectedLeads.length === 0 || selectedEmployees.length === 0) {
      toast.error('Please select leads and employees');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://tc-crm.vercel.app/api/leads/distribute',
        {
          leadIds: selectedLeads,
          employeeIds: selectedEmployees
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Leads distributed successfully');
      setSelectedLeads([]);
      setSelectedEmployees([]);
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lead distribution failed');
    }
  };

  // Approval functions
  const handleApproval = async (type, id, action, notes = '') => {
    try {
      const token = localStorage.getItem('token');
      
      if (type === 'leave') {
        // For leave applications, we need to find the employee and leave details
        const leaveApplication = approvals.leaveApplications.find(app => app.id === id);
        if (leaveApplication) {
          await axios.patch(
            `https://tc-crm.vercel.app/api/employees/${leaveApplication.employeeId}/leave/${id}`,
            { status: action === 'approve' ? 'approved' : 'rejected', notes },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } else {
        // For other approval types, use the general endpoint
        await axios.patch(
          `https://tc-crm.vercel.app/api/approvals`,
          { type, id, action },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchApprovals();
      fetchLeaveApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval action failed');
    }
  };

  // Payment functions
  const handlePaymentEntry = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://tc-crm.vercel.app/api/payments/entries',
        { amount: parseFloat(paymentAmount) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Payment entry created successfully');
      setPaymentAmount('');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment entry failed');
    }
  };

  const handleClaimPayment = async (paymentId, leadId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `https://tc-crm.vercel.app/api/payments/claim/${paymentId}`,
        { leadId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Payment claimed successfully');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment claim failed');
    }
  };

  // Form input handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('bankDetails.')) {
      const bankField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [bankField]: value }
      }));
    } else if (name.startsWith('access.')) {
      const accessField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        access: { ...prev.access, [accessField]: checked }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Access control input handler
  const handleAccessControlChange = (field, checked) => {
    setAccessControlData(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  // Employee row component
  const EmployeeRow = ({ employee }) => (
    <tr key={employee.employeeId} className="border-b border-gray-200 hover:bg-gray-50 text-sm">
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {employee.name?.charAt(0)?.toUpperCase() || 'E'}
              </span>
            </div>
          </div>
          <div className="ml-2">
            <div className="text-sm font-medium text-gray-900">{employee.name}</div>
            <div className="text-sm text-gray-500">{employee.email}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="text-sm text-gray-900">{employee.employeeId}</div>
        <div className="text-sm text-gray-500">{employee.personalMobile}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getStatusColor(employee.status, employee.isBlocked)}`}>
          {employee.isBlocked ? 'Blocked' : getStatusText(employee.status)}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
        <div>On: {employee.onlineTime || '0h'}</div>
        <div>Break: {employee.breakTime || '0h'}</div>
        <div>Blk: {employee.blockedTime || '0h'}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
        <div>Pend: {employee.leadsPending || 0}</div>
        <div>Assg: {employee.leadsAssigned || 0}</div>
        <div>Cls: {employee.leadsClosed || 0}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
        <div>Col: ₹{employee.paymentCollection || 0}</div>
        <div>Pend: ₹{employee.pendingPayment || 0}</div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => handleEdit(employee)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => openAccessControlModal(employee)}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 focus:outline-none text-sm"
          >
            Access
          </button>
          <button
            onClick={() => openResetPasswordModal(employee)}
            className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 focus:outline-none text-sm"
          >
            Reset Pwd
          </button>
          {employee.isBlocked ? (
            <button
              onClick={() => openUnblockModal(employee)}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 focus:outline-none text-sm"
            >
              Unblock
            </button>
          ) : (
            <button
              onClick={() => openBlockModal(employee)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none text-sm"
            >
              Block
            </button>
          )}
          <button
            onClick={() => handleDelete(employee.employeeId)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 focus:outline-none text-sm"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );

  // Inside Employee component:
  useEffect(() => {
    // Only run for employee self-panel (not admin panel)
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'employee' && user.employeeId) {
      usePresence(user.employeeId);
    }
  }, []);

  const handleAddLead = async (newLead, idx) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('https://tc-crm.vercel.app/api/leads/led', newLead, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const created = res.data?.lead || res.data; // adjust if backend returns differently
      if (created && created._id) {
        setLeadRows(rows => rows.map((row, i) =>
          i === idx
            ? {
                ...row,
                _id: created._id,
                brandName: created.brandName || row.brandName || '',
                additionalNotes: created.additionalNotes || row.additionalNotes || '',
                _lastBrandName: created.brandName || row.brandName || '',
                _lastNotes: created.additionalNotes || row.additionalNotes || ''
              }
            : row
        ));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add lead');
    }
  };

  // Update handleLeadDistribution for single lead/employee
  const handleSingleLeadAssign = async () => {
    if (!selectedLeadId || !selectedEmployeeId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://tc-crm.vercel.app/api/leads/distribute', {
        leadIds: [selectedLeadId],
        employeeIds: [selectedEmployeeId],
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Lead assigned successfully');
      setSelectedLeadId(null);
      setSelectedEmployeeId('');
      fetchLeads();
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to assign lead');
    } finally {
      setLoading(false);
    }
  };

  // Add new row handler for '+ Add another' button
  const handleAddRow = () => {
    setLeadRows(rows => [...rows, { mobileNumber: '', brandName: '', additionalNotes: '' }]);
  };

  // Remove a row handler for the × button
  const handleRemoveRow = (idx) => {
    setLeadRows(rows => rows.filter((_, i) => i !== idx));
  };

  const handleLeadRowChange = (idx, field, value) => {
    setLeadRows(rows => {
      const updated = [...rows];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Auto-submit when mobile number is filled in any row
  useEffect(() => {
    leadRows.forEach((row, idx) => {
      // Only trigger when mobile number is exactly 10 digits (adjust as needed)
      if (
        row.mobileNumber &&
        /^\d{10}$/.test(row.mobileNumber) &&
        !row._submitted
      ) {
        setLeadRows(rows => rows.map((r, i) => i === idx ? { ...r, _submitted: true } : r));
        (async () => {
          setAddLeadSubmitting(true);
          try {
            await handleAddLead({
              mobileNumbers: [row.mobileNumber],
              brandName: row.brandName,
              additionalNotes: row.additionalNotes
            }, idx);
          } catch (err) {
            toast.error(err?.message || 'Failed to save lead');
          } finally {
            setAddLeadSubmitting(false);
          }
        })();
      }
    });
  }, [leadRows]);

  // Update lead in backend if brand name or notes change after lead is created (10-digit number and _submitted)
  useEffect(() => {
    leadRows.forEach((row, idx) => {
      if (
        row._id &&
        row.mobileNumber &&
        /^\d{10}$/.test(row.mobileNumber) &&
        row._submitted &&
        (row._lastBrandName !== row.brandName || row._lastNotes !== row.additionalNotes)
      ) {
        setLeadRows(rows => rows.map((r, i) => i === idx ? { ...r, _lastBrandName: row.brandName, _lastNotes: row.additionalNotes } : r));
        (async () => {
          try {
            await axios.put(`https://tc-crm.vercel.app/api/leads/${row._id}`, {
              brandName: row.brandName,
              additionalNotes: row.additionalNotes
            }, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            });
          } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update lead');
          }
        })();
      }
    });
  }, [leadRows]);

  // On mount, fetch backend leads and set as leadRows
  useEffect(() => {
    const fetchBackendLeads = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('https://tc-crm.vercel.app/api/leads/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data)) {
          // Only show unassigned leads
          const unassigned = res.data.filter(lead => !lead.assignedTo);
          const rows = unassigned.map(lead => ({
            _id: lead._id,
            mobileNumber: lead.mobileNumber || lead.mobileNumbers?.[0] || '',
            brandName: lead.brandName || '',
            additionalNotes: lead.additionalNotes || '',
            _submitted: true,
            _lastBrandName: lead.brandName || '',
            _lastNotes: lead.additionalNotes || ''
          }));
          setLeadRows(rows.length > 0 ? rows : [{ mobileNumber: '', brandName: '', additionalNotes: '', _submitted: false }]);
        }
      } catch (err) {
        setLeadRows([{ mobileNumber: '', brandName: '', additionalNotes: '', _submitted: false }]);
      }
    };
    fetchBackendLeads();
  }, []);

  // Fetch available leads and employees for distribution
  const openDistribution = async () => {
    console.log('openDistribution called');
    setIsDistributionOpen(true);
    setDistributionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      console.log('User:', user);
      
      // Check if user has permission
      if (!user || !['admin', 'super-admin'].includes(user.role)) {
        toast.error('Access denied. You do not have permission to access distribution data.');
        setIsDistributionOpen(false);
        return;
      }
      
      console.log('Fetching leads for distribution...');
      // Get available leads (unassigned)
      const leadsRes = await axios.get('https://tc-crm.vercel.app/api/leads/distribution', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Leads response:', leadsRes.data);
      setDistributionLeads(leadsRes.data.leads || []);
      
      console.log('Fetching employees for distribution...');
      // Get employees
      const employeesRes = await axios.get('https://tc-crm.vercel.app/api/employees/lead-distribution', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Employees response:', employeesRes.data);
      setDistributionEmployees(employeesRes.data || []);
    } catch (err) {
      console.error('Distribution data loading error:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (err.response?.status === 403) {
        toast.error('Access denied. You do not have permission to access distribution data.');
      } else if (err.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(
          err.response?.data?.message || err.message || 'Failed to load distribution data'
        );
      }
      setIsDistributionOpen(false);
    } finally {
      setDistributionLoading(false);
    }
  };

  // Distribute selected leads to selected employees
  const handleDistributeLeads = async () => {
    if (!selectedDistributionLeads.length || !selectedDistributionEmployees.length) return;
    setDistributionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://tc-crm.vercel.app/api/leads/distribute', {
        leadIds: selectedDistributionLeads,
        employeeIds: selectedDistributionEmployees
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove assigned leads from leadRows
      setLeadRows(rows => rows.filter(row => !selectedDistributionLeads.includes(row._id)));
      setIsDistributionOpen(false);
      setSelectedDistributionLeads([]);
      setSelectedDistributionEmployees([]);
    } catch (err) {
      toast.error('Failed to distribute leads');
    } finally {
      setDistributionLoading(false);
    }
  };

  return (
    <div className={`flex-1 transition-margin duration-300 mt-16 ${sidebarCollapsed ? 'ml-16' : 'ml-48'}`}>
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'pl-4' : 'pl-0'}`}>
        <Header title="Employee Management" sidebarCollapsed={sidebarCollapsed} />
      </div>
      <div className={`p-4 sm:p-6 transition-all duration-300 ${sidebarCollapsed ? 'pl-4' : 'pl-0'}`}>
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            {[
              { id: 'employees', name: 'Employees' },
              ...(userRole === 'admin' || userRole === 'super-admin' ? [
                { id: 'leads', name: 'Lead Distribution' },
                { id: 'assignedLeads', name: 'Assigned Leads' },
                { id: 'approvals', name: 'Approvals' }
              ] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div>
            {/* Filters and Add Button */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="blocked">Blocked</option>
                  <option value="on_leave">On Leave</option>
                </select>
                
                <select
                  value={productivityFilter}
                  onChange={(e) => setProductivityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>

                {productivityFilter === 'custom' && (
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddEmployee}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add Employee
                  </button>
                </div>
                {/* Show live clock in 12-hour format with AM/PM */}
                <div className="text-xs text-green-600 font-semibold">
                  Live time: {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
              </div>
            </div>

            {/* Employee Table: Responsive, Compact, Larger Text */}
            <div className="bg-white shadow overflow-x-auto sm:rounded-md max-h-[60vh] min-h-[200px]">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Emp</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">ID/Contact</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Time</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Leads</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Payment</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map(employee => (
                        <EmployeeRow key={employee.employeeId} employee={employee} />
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  {pagination.total > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                          disabled={pagination.current === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                          disabled={pagination.current === pagination.total}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{((pagination.current - 1) * 10) + 1}</span> to{' '}
                            <span className="font-medium">
                              {Math.min(pagination.current * 10, pagination.totalRecords)}
                            </span>{' '}
                            of <span className="font-medium">{pagination.totalRecords}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                              disabled={pagination.current === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                              disabled={pagination.current === pagination.total}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Lead Distribution Tab */}
        {activeTab === 'leads' && (userRole === 'admin' || userRole === 'super-admin') ? (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add New Lead</h3>
            </div>
            <div className="flex flex-col gap-2">
              {leadRows.map((row, idx) => (
                <div key={idx} className="flex flex-col lg:flex-row gap-4 items-start border-b pb-4 mb-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold self-center lg:self-auto">{idx + 1}</div>
                  <div className="w-full lg:w-1/3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                    <input type="text" value={row.mobileNumber} onChange={e => handleLeadRowChange(idx, 'mobileNumber', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
                  </div>
                  <div className="w-full lg:w-1/3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Brand Name</label>
                    <input type="text" value={row.brandName} onChange={e => handleLeadRowChange(idx, 'brandName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div className="w-full lg:w-1/3">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                    <textarea value={row.additionalNotes} onChange={e => handleLeadRowChange(idx, 'additionalNotes', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none h-[40px]" />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700 self-start"
                  disabled={addLeadSubmitting}
                  onClick={() => setLeadRows(rows => [...rows, { mobileNumber: '', brandName: '', additionalNotes: '', _submitted: false }])}
                >+ Add another</button>
                <button
                  type="button"
                  className="bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 self-start"
                  onClick={openDistribution}
                >Lead Distribution</button>
              </div>
            </div>
          </div>
        ) : activeTab === 'leads' ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">You do not have permission to access Lead Distribution.</p>
          </div>
        ) : null}

        {/* Assigned Leads Tab */}
        {activeTab === 'assignedLeads' && (userRole === 'admin' || userRole === 'super-admin') && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Leads</h3>
            <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-4 text-gray-400">No assigned leads found.</td>
                    </tr>
                  ) : (
                    // Group by assignedTo
                    Object.entries(
                      assignedLeads.reduce((acc, lead) => {
                        const key = lead.assignedTo ? lead.assignedTo.employeeId || lead.assignedTo._id : 'Unassigned';
                        if (!acc[key]) acc[key] = { employee: lead.assignedTo, leads: [] };
                        acc[key].leads.push(lead);
                        return acc;
                      }, {})
                    ).map(([key, group]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 cursor-pointer text-blue-600 hover:underline" onClick={() => setSelectedEmployeeLeads(group)}>
                          {group.employee ? `${group.employee.name || '-'} (${group.employee.employeeId || group.employee._id || '-'})` : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-2">{group.leads.length}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Modal or section to show all leads for selected employee */}
            {selectedEmployeeLeads && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full relative">
                  <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setSelectedEmployeeLeads(null)}>&times;</button>
                  <h4 className="text-lg font-semibold mb-4">Leads for {selectedEmployeeLeads.employee ? `${selectedEmployeeLeads.employee.name} (${selectedEmployeeLeads.employee.employeeId || selectedEmployeeLeads.employee._id})` : '-'}</h4>
                  <table className="min-w-full divide-y divide-gray-200 text-sm mb-2">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Assigned At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedEmployeeLeads.leads.map(lead => (
                        <tr key={lead.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium">{lead.phoneNumber}</div>
                            <div className="text-sm text-gray-600">{lead.brandName}</div>
                            <div className="text-sm text-gray-500">{lead.notes}</div>
                          </td>
                          <td className="px-3 py-2">
                            {lead.assignedBy ?
                              (lead.assignedBy.name && lead.assignedBy.role && lead.assignedBy.id
                                ? `${lead.assignedBy.name} (${lead.assignedBy.role}, ${lead.assignedBy.id})`
                                : lead.assignedBy.name
                              )
                              : <span className="text-gray-400">-</span>}
                          </td>
                          <td className="px-3 py-2">{lead.assignedAt ? new Date(lead.assignedAt).toLocaleString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && (userRole === 'admin' || userRole === 'super-admin') && (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leave Applications */}
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Leave Applications</h4>
                <div className="space-y-3">
                  {approvals.leaveApplications.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      No pending leave applications
                    </div>
                  ) : (
                    approvals.leaveApplications.map(app => (
                      <div key={app.id} className="border rounded-md p-3 bg-blue-50 border-blue-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-blue-900">{app.employeeName}</div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            ID: {app.employeeId}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <strong>Reason:</strong> {app.reason}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Period:</strong> {app.dates}
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          Applied: {new Date(app.requestedAt).toLocaleDateString()}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproval('leave', app.id, 'approve')}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Enter rejection reason (optional):');
                              if (notes !== null) {
                                handleApproval('leave', app.id, 'reject', notes);
                              }
                            }}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                          >
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Block Requests */}
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Block Requests</h4>
                <div className="space-y-3">
                  {approvals.blockRequests.map(req => (
                    <div key={req.id} className="border rounded-md p-3">
                      <div className="font-medium">{req.employeeName}</div>
                      <div className="text-sm text-gray-600">{req.reason}</div>
                      <div className="text-sm text-gray-500">{req.requestedAt}</div>
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => handleApproval('block', req.id, 'approve')}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval('block', req.id, 'reject')}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Login Requests */}
              <div className="bg-white shadow rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Login Requests</h4>
                <div className="space-y-3">
                  {approvals.loginRequests.map(req => (
                    <div key={req.id} className="border rounded-md p-3">
                      <div className="font-medium">{req.employeeName}</div>
                      <div className="text-sm text-gray-600">{req.reason}</div>
                      <div className="text-sm text-gray-500">{req.requestedAt}</div>
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={() => handleApproval('login', req.id, 'approve')}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval('login', req.id, 'reject')}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


      </div>

      {/* Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Password {!editingEmployee ? '*' : ''}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingEmployee}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editingEmployee && (
                      <p className="text-xxs text-gray-500 mt-0.5">
                        Leave blank to keep current password
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Personal Mobile</label>
                    <input
                      type="text"
                      name="personalMobile"
                      value={formData.personalMobile}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Company Mobile</label>
                    <input
                      type="text"
                      name="companyMobile"
                      value={formData.companyMobile}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Reference Mobile</label>
                    <input
                      type="text"
                      name="referenceMobile"
                      value={formData.referenceMobile}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Personal Email</label>
                    <input
                      type="email"
                      name="personalEmail"
                      value={formData.personalEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Company Email</label>
                    <input
                      type="email"
                      name="companyEmail"
                      value={formData.companyEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Aadhar Card</label>
                    <input
                      type="text"
                      name="aadharCard"
                      value={formData.aadharCard}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Pan Card</label>
                    <input
                      type="text"
                      name="panCard"
                      value={formData.panCard}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Joined Through</label>
                    <input
                      type="text"
                      name="joinedThrough"
                      value={formData.joinedThrough}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Super Admin: Create Without Access Option */}
                {userRole === 'super-admin' && !editingEmployee && (
                  <div className="border-t pt-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="createWithoutAccess"
                        checked={createWithoutAccess}
                        onChange={(e) => setCreateWithoutAccess(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="createWithoutAccess" className="ml-2 block text-sm text-gray-900">
                        Create employee without access permissions (Super Admin only)
                      </label>
                    </div>
                    <p className="text-xxs text-gray-500 mt-0.5">
                      This will create the employee with all access permissions set to false. You can update them later.
                    </p>
                  </div>
                )}

                {/* Access Permissions - Only show if not creating without access */}
                {(!createWithoutAccess || editingEmployee) && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Access Permissions</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">Sales</label>
                              <p className="text-xs text-gray-500">Access to sales features</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.sales"
                            checked={formData.access.sales}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">Operation</label>
                              <p className="text-xs text-gray-500">Access to operations</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.operation"
                            checked={formData.access.operation}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">Advocate</label>
                              <p className="text-xs text-gray-500">Legal advocate access</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.advocate"
                            checked={formData.access.advocate}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">Lead Add</label>
                              <p className="text-xs text-gray-500">Add new leads</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.leadAdd"
                            checked={formData.access.leadAdd}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-900">Copy</label>
                              <p className="text-xs text-gray-500">Copy data access</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            name="access.copy"
                            checked={formData.access.copy}
                            onChange={handleInputChange}
                            className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-blue-800 font-medium">Access Control</p>
                          <p className="text-xs text-blue-600 mt-1">
                            Select the permissions this employee should have. Each permission grants access to specific features and data.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                  <textarea
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingEmployee ? 'Update Employee' : 'Create Employee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lead Distribution Modal */}
      {isDistributionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl p-0 max-w-3xl w-full relative border border-blue-100">
            <button className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-3xl font-bold transition-colors" onClick={() => setIsDistributionOpen(false)}>&times;</button>
            <div className="px-8 pt-8 pb-2">
              <h3 className="text-2xl font-bold text-blue-900 mb-2 tracking-tight">Lead Distribution</h3>
              <p className="text-gray-500 mb-6 text-sm">Assign available leads to employees. Select multiple leads and employees for bulk assignment.</p>
              {distributionLoading ? (
                <div className="text-center py-12 text-lg text-blue-600 font-semibold">Loading...</div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Leads */}
                  <div className="w-full md:w-1/2 bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-blue-800 text-lg">Available Leads</h4>
                      <span className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-0.5">{selectedDistributionLeads.length} selected</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded bg-white p-2">
                      {distributionLeads.length > 0 && (
                        <label className="flex items-center gap-2 mb-2 cursor-pointer font-medium text-blue-700">
                          <input
                            type="checkbox"
                            checked={selectedDistributionLeads.length === distributionLeads.length}
                            indeterminate={selectedDistributionLeads.length > 0 && selectedDistributionLeads.length < distributionLeads.length ? true : undefined}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedDistributionLeads(distributionLeads.map(lead => lead.id));
                              } else {
                                setSelectedDistributionLeads([]);
                              }
                            }}
                          />
                          <span>Select All</span>
                        </label>
                      )}
                      {distributionLeads.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-8">No available leads</div>
                      ) : distributionLeads.map(lead => (
                        <label key={lead.id} className={`flex items-center gap-2 mb-1 cursor-pointer rounded px-2 py-1 transition ${selectedDistributionLeads.includes(lead.id) ? 'bg-blue-100' : 'hover:bg-blue-50'}`}>
                          <input
                            type="checkbox"
                            checked={selectedDistributionLeads.includes(lead.id)}
                            onChange={e => setSelectedDistributionLeads(sel => e.target.checked ? [...sel, lead.id] : sel.filter(id => id !== lead.id))}
                          />
                          <span className="text-sm text-gray-800">{lead.phoneNumber} {lead.brandName && <span className="text-gray-500">({lead.brandName})</span>}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Employees */}
                  <div className="w-full md:w-1/2 bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800 text-lg">Select Employees</h4>
                      <span className="text-xs text-green-700 bg-green-100 rounded px-2 py-0.5">{selectedDistributionEmployees.length} selected</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded bg-white p-2">
                      {distributionEmployees.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-8">No employees found</div>
                      ) : distributionEmployees.map(emp => (
                        <label key={emp.employeeId} className={`flex items-center gap-2 mb-1 cursor-pointer rounded px-2 py-1 transition ${selectedDistributionEmployees.includes(emp.employeeId) ? 'bg-green-100' : 'hover:bg-green-50'}`}>
                          <input
                            type="radio"
                            name="distribution-employee"
                            checked={selectedDistributionEmployees.includes(emp.employeeId)}
                            onChange={e => setSelectedDistributionEmployees(e.target.checked ? [emp.employeeId] : [])}
                          />
                          <span className="text-sm text-gray-800">{emp.name} <span className="text-gray-500">(ID: {emp.employeeId})</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-8 flex justify-end gap-3 border-t pt-4">
                <button
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                  onClick={() => setIsDistributionOpen(false)}
                >Cancel</button>
                <button
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition disabled:opacity-50"
                  disabled={distributionLoading || !selectedDistributionLeads.length || !selectedDistributionEmployees.length}
                  onClick={handleDistributeLeads}
                >Distribute</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Employee Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Block Employee</h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to block <span className="font-semibold">{selectedEmployee?.name}</span>?
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for blocking <span className="text-red-500">*</span>
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter the reason for blocking this employee..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockEmployee}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Block Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Employee Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Unblock Employee</h3>
              <button
                onClick={() => setShowUnblockModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to unblock <span className="font-semibold">{selectedEmployee?.name}</span>?
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for unblocking <span className="text-red-500">*</span>
              </label>
              <textarea
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
                placeholder="Enter the reason for unblocking this employee..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUnblockModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUnblockEmployee}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Unblock Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Control Modal */}
      {showAccessControlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Access Control</h3>
                  <p className="text-sm text-gray-600">Manage permissions for {selectedEmployee?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccessControlModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Sales</label>
                        <p className="text-xs text-gray-500">Access to sales features</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.sales}
                      onChange={(e) => handleAccessControlChange('sales', e.target.checked)}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Operation</label>
                        <p className="text-xs text-gray-500">Access to operations</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.operation}
                      onChange={(e) => handleAccessControlChange('operation', e.target.checked)}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Advocate</label>
                        <p className="text-xs text-gray-500">Legal advocate access</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.advocate}
                      onChange={(e) => handleAccessControlChange('advocate', e.target.checked)}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Lead Add</label>
                        <p className="text-xs text-gray-500">Add new leads</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.leadAdd}
                      onChange={(e) => handleAccessControlChange('leadAdd', e.target.checked)}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-900">Copy</label>
                        <p className="text-xs text-gray-500">Copy data access</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={accessControlData.copy}
                      onChange={(e) => handleAccessControlChange('copy', e.target.checked)}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAccessControlModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAccessControlUpdate}
                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              >
                Update Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
                  <p className="text-sm text-gray-600">Generate new password for {selectedEmployee?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm text-orange-800 font-medium">Important</p>
                  <p className="text-xs text-orange-600 mt-1">
                    This will generate a new random password for the employee. The new password will be displayed after reset. Please share it securely with the employee.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPasswordLoading}
                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetPasswordLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Resetting...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Employee; 