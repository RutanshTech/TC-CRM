import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Operation = ({ sidebarCollapsed }) => {
  // Main states
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState(null);
  const [userRole, setUserRole] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalRecords: 0
  });

  // Operation form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    notifications: false,
    receivedForDrafting: false,
    paymentReceiptReceived: false,
    requestForFilling: false,
    clientUpdation: false,
    leads: false,
    completeLead: false,
    dataUpdationNotify: false,
    chat: false,
    leadEditOption: false,
    upload: false,
    draft: false,
    poa: false,
    ua: false,
    salesPersonName: '',
    salesPersonId: '',
    fillingText: '',
    clients: false,
    afterPaymentMarkDoneLeadsMoveToClients: false,
    leadTransferToAdvocate: false,
    log: {
      who: '',
      what: '',
      when: new Date(),
      where: ''
    }
  });

  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setUserRole(user?.role || '');
    fetchOperations();
  }, [filters, pagination.current]);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 10,
        search: filters.search,
        status: filters.status
      });

      const response = await axios.get(`http://localhost:3000/api/operations?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOperations(response.data.operations);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching operations:', error);
      toast.error(error.response?.data?.message || 'Error fetching operations');
    }
    setLoading(false);
  };

  const handleAddOperation = () => {
    setEditingOperation(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (operation) => {
    setEditingOperation(operation);
    setFormData({
      name: operation.name,
      email: operation.email,
      password: '',
      notifications: operation.notifications || false,
      receivedForDrafting: operation.receivedForDrafting || false,
      paymentReceiptReceived: operation.paymentReceiptReceived || false,
      requestForFilling: operation.requestForFilling || false,
      clientUpdation: operation.clientUpdation || false,
      leads: operation.leads || false,
      completeLead: operation.completeLead || false,
      dataUpdationNotify: operation.dataUpdationNotify || false,
      chat: operation.chat || false,
      leadEditOption: operation.leadEditOption || false,
      upload: operation.upload || false,
      draft: operation.draft || false,
      poa: operation.poa || false,
      ua: operation.ua || false,
      salesPersonName: operation.salesPersonName || '',
      salesPersonId: operation.salesPersonId || '',
      fillingText: operation.fillingText || '',
      clients: operation.clients || false,
      afterPaymentMarkDoneLeadsMoveToClients: operation.afterPaymentMarkDoneLeadsMoveToClients || false,
      leadTransferToAdvocate: operation.leadTransferToAdvocate || false,
      log: operation.log || { who: '', what: '', when: new Date(), where: '' }
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      notifications: false,
      receivedForDrafting: false,
      paymentReceiptReceived: false,
      requestForFilling: false,
      clientUpdation: false,
      leads: false,
      completeLead: false,
      dataUpdationNotify: false,
      chat: false,
      leadEditOption: false,
      upload: false,
      draft: false,
      poa: false,
      ua: false,
      salesPersonName: '',
      salesPersonId: '',
      fillingText: '',
      clients: false,
      afterPaymentMarkDoneLeadsMoveToClients: false,
      leadTransferToAdvocate: false,
      log: {
        who: '',
        what: '',
        when: new Date(),
        where: ''
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (editingOperation) {
        // Update operation
        await axios.put(
          `http://localhost:3000/api/operations/${editingOperation._id}`,
          {
            name: formData.name,
            email: formData.email
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Operation updated successfully!');
      } else {
        // Create operation
        await axios.post(
          'http://localhost:3000/api/operations',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Operation created successfully!');
      }

      setIsModalOpen(false);
      resetForm();
      setEditingOperation(null);
      fetchOperations();
    } catch (error) {
      console.error('Error saving operation:', error);
      toast.error(error.response?.data?.message || 'Error saving operation');
    }
    setLoading(false);
  };

  const handleDelete = async (operationId) => {
    if (!window.confirm('Are you sure you want to delete this operation?')) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/operations/${operationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Operation deleted successfully!');
      fetchOperations();
    } catch (error) {
      console.error('Error deleting operation:', error);
      toast.error(error.response?.data?.message || 'Error deleting operation');
    }
    setLoading(false);
  };

  const openBlockModal = (operation) => {
    setSelectedOperation(operation);
    setBlockReason('');
    setShowBlockModal(true);
  };

  const openUnblockModal = (operation) => {
    setSelectedOperation(operation);
    setShowUnblockModal(true);
  };

  const openResetPasswordModal = (operation) => {
    setSelectedOperation(operation);
    setNewPassword('');
    setShowResetPasswordModal(true);
  };

  const handleBlockOperation = async () => {
    if (!blockReason.trim()) {
      toast.error('Please provide a reason for blocking');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/api/operations/${selectedOperation._id}/block`,
        { reason: blockReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Operation blocked successfully!');
      setShowBlockModal(false);
      setSelectedOperation(null);
      setBlockReason('');
      fetchOperations();
    } catch (error) {
      console.error('Error blocking operation:', error);
      toast.error(error.response?.data?.message || 'Error blocking operation');
    }
    setLoading(false);
  };

  const handleUnblockOperation = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/api/operations/${selectedOperation._id}/unblock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Operation unblocked successfully!');
      setShowUnblockModal(false);
      setSelectedOperation(null);
      fetchOperations();
    } catch (error) {
      console.error('Error unblocking operation:', error);
      toast.error(error.response?.data?.message || 'Error unblocking operation');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `http://localhost:3000/api/operations/${selectedOperation._id}/reset-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Password reset successfully!');
      setShowResetPasswordModal(false);
      setSelectedOperation(null);
      setNewPassword('');
      
      // Show the new password to admin
      if (response.data.operation.plainPassword) {
        toast.info(`New password: ${response.data.operation.plainPassword}`);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Error resetting password');
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('log.')) {
      // Handle log fields
      const logField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        log: {
          ...prev.log,
          [logField]: type === 'date' ? new Date(value) : value
        }
      }));
    } else {
      // Handle regular fields
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const getStatusColor = (status, isBlocked) => {
    if (isBlocked) return 'bg-red-100 text-red-800';
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
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
      default:
        return 'Unknown';
    }
  };

  const OperationRow = ({ operation }) => (
    <tr key={operation._id} className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              {operation.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{operation.name}</div>
            <div className="text-sm text-gray-500">{operation.email}</div>
            {operation.salesPersonName && (
              <div className="text-xs text-gray-400">
                Sales: {operation.salesPersonName} ({operation.salesPersonId})
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(operation.status, operation.isBlocked)}`}>
            {getStatusText(operation.status)}
          </span>
          <div className="flex flex-wrap gap-1">
            {operation.notifications && (
              <span className="inline-flex px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">Notifications</span>
            )}
            {operation.leads && (
              <span className="inline-flex px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Leads</span>
            )}
            {operation.clients && (
              <span className="inline-flex px-1 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">Clients</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div>
          <div>{new Date(operation.createdAt).toLocaleDateString()}</div>
          {operation.fillingText && (
            <div className="text-xs text-gray-400 truncate max-w-xs" title={operation.fillingText}>
              {operation.fillingText}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => handleEdit(operation)}
            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
          >
            Edit
          </button>
          {operation.isBlocked ? (
            <button
              onClick={() => openUnblockModal(operation)}
              className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
            >
              Unblock
            </button>
          ) : (
            <button
              onClick={() => openBlockModal(operation)}
              className="text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
            >
              Block
            </button>
          )}
          <button
            onClick={() => openResetPasswordModal(operation)}
            className="text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
          >
            Reset Password
          </button>
          <button
            onClick={() => handleDelete(operation._id)}
            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-48'} pt-14`}>
        <Header sidebarCollapsed={sidebarCollapsed} />
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Operations Management</h1>
            <button
              onClick={handleAddOperation}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Create Operation
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                                  <input
                    type="text"
                    placeholder="Search by name, email, sales person, or filling text..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
              </div>
              <div className="md:w-48">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operations Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : operations.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                        No operations found
                      </td>
                    </tr>
                  ) : (
                    operations.map(operation => (
                      <OperationRow key={operation._id} operation={operation} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                    disabled={pagination.current === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                    disabled={pagination.current === pagination.total}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.current}</span> of{' '}
                      <span className="font-medium">{pagination.total}</span> pages
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                        disabled={pagination.current === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                        disabled={pagination.current === pagination.total}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingOperation ? 'Edit Operation' : 'Create Operation'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {!editingOperation && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                {/* Sales Person Details */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Sales Person Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sales Person Name
                      </label>
                      <input
                        type="text"
                        name="salesPersonName"
                        value={formData.salesPersonName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sales Person ID
                      </label>
                      <input
                        type="text"
                        name="salesPersonId"
                        value={formData.salesPersonId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Filling Text */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Filling Details</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filling Text
                    </label>
                    <textarea
                      name="fillingText"
                      value={formData.fillingText}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter filling text..."
                    />
                  </div>
                </div>

                {/* Operation Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Operation Settings</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="notifications"
                        checked={formData.notifications}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Notifications</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="receivedForDrafting"
                        checked={formData.receivedForDrafting}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Received for Drafting</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="paymentReceiptReceived"
                        checked={formData.paymentReceiptReceived}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Payment Receipt Received</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="requestForFilling"
                        checked={formData.requestForFilling}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Request for Filling</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="clientUpdation"
                        checked={formData.clientUpdation}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Updation in Client</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="leads"
                        checked={formData.leads}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Leads</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="completeLead"
                        checked={formData.completeLead}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Complete Lead</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="dataUpdationNotify"
                        checked={formData.dataUpdationNotify}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Updation in Data (Notify)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="chat"
                        checked={formData.chat}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Chat</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="leadEditOption"
                        checked={formData.leadEditOption}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Lead Edit Option</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="upload"
                        checked={formData.upload}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Upload</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="draft"
                        checked={formData.draft}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Draft</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="poa"
                        checked={formData.poa}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">POA</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="ua"
                        checked={formData.ua}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">UA</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="clients"
                        checked={formData.clients}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Clients</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="afterPaymentMarkDoneLeadsMoveToClients"
                        checked={formData.afterPaymentMarkDoneLeadsMoveToClients}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">After Payment mark Done Leads move to Clients</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="leadTransferToAdvocate"
                        checked={formData.leadTransferToAdvocate}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Lead Transfer to Advocate</span>
                    </label>
                  </div>
                </div>

                {/* Log Details */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-3">Log Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Who
                      </label>
                      <input
                        type="text"
                        name="log.who"
                        value={formData.log.who}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What
                      </label>
                      <input
                        type="text"
                        name="log.what"
                        value={formData.log.what}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        When
                      </label>
                      <input
                        type="datetime-local"
                        name="log.when"
                        value={formData.log.when ? new Date(formData.log.when).toISOString().slice(0, 16) : ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Where
                      </label>
                      <input
                        type="text"
                        name="log.where"
                        value={formData.log.where}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Saving...' : (editingOperation ? 'Update' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                      setEditingOperation(null);
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Block Operation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to block <strong>{selectedOperation?.name}</strong>?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for blocking
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reason for blocking..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBlockOperation}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Blocking...' : 'Block'}
                </button>
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setSelectedOperation(null);
                    setBlockReason('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unblock Modal */}
      {showUnblockModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Unblock Operation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to unblock <strong>{selectedOperation?.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleUnblockOperation}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Unblocking...' : 'Unblock'}
                </button>
                <button
                  onClick={() => {
                    setShowUnblockModal(false);
                    setSelectedOperation(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reset Password</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter a new password for <strong>{selectedOperation?.name}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedOperation(null);
                    setNewPassword('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Operation; 