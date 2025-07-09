import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Header from '../components/Header';

const PaymentManagement = ({ sidebarCollapsed = false }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalRecords: 0
  });
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalPayments: 0,
    verifiedAmount: 0,
    verifiedCount: 0,
    pendingAmount: 0,
    pendingCount: 0
  });

  // Form state for payment creation/editing
  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: '',
    receiptNumber: '',
    transactionId: '',
    dueDate: ''
  });

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...filters
      });

      const response = await axios.get(`/api/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPayments(response.data.payments);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch payments');
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://tc-crm.vercel.app/api/payments/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStats();
    // eslint-disable-next-line
  }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingPayment 
        ? `/api/payments/${editingPayment._id}`
        : '/api/payments';
      
      const method = editingPayment ? 'put' : 'post';
      
      const response = await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(response.data.message);
      setShowModal(false);
      setEditingPayment(null);
      resetForm();
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      paymentMethod: '',
      receiptNumber: '',
      transactionId: '',
      dueDate: ''
    });
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      paymentMethod: payment.paymentMethod,
      receiptNumber: payment.receiptNumber || '',
      transactionId: payment.transactionId || '',
      dueDate: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Payment deleted successfully');
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };



  const handleVerify = async (paymentId, action) => {
    const notes = prompt(`Enter ${action} notes:`);
    if (!notes) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/payments/${paymentId}/verify`, { action, notes }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Payment ${action}ed successfully`);
      fetchPayments();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'claimed': return 'text-blue-600 bg-blue-100';
      case 'verified': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'claimed': return 'Claimed';
      case 'verified': return 'Verified';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <div className="flex-1 bg-gray-100 min-h-screen">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-48'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Payment Management</h1>
            <button
              onClick={() => {
                setEditingPayment(null);
                resetForm();
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Payment Entry
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Amount</div>
              <div className="text-2xl font-bold text-gray-900">₹{stats.totalAmount?.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Payments</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPayments}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Verified Amount</div>
              <div className="text-2xl font-bold text-green-600">₹{stats.verifiedAmount?.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Pending Amount</div>
              <div className="text-2xl font-bold text-yellow-600">₹{stats.pendingAmount?.toLocaleString()}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by lead ID, phone, or company..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="claimed">Claimed</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Payment Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Claimed By / Lead
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-lg font-medium text-gray-900">₹{payment.amount?.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{payment.paymentMethod}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.claimedBy ? (
                            <div>
                              <div className="font-medium">{payment.claimedBy.name}</div>
                              <div className="text-gray-500 text-xs">{payment.claimedBy.employeeId}</div>
                              {payment.leadId && (
                                <div className="text-blue-600 text-xs">Lead: {payment.leadId}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not claimed</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            {payment.status === 'claimed' && (
                              <>
                                <button
                                  onClick={() => handleVerify(payment._id, 'verify')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => handleVerify(payment._id, 'reject')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleEdit(payment)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            {payment.status === 'pending' && (
                              <button
                                onClick={() => handleDelete(payment._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.total > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex space-x-2">
                {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => fetchPayments(page)}
                    className={`px-3 py-2 rounded-lg ${
                      page === pagination.current
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingPayment ? 'Edit Payment' : 'Add New Payment'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                  <select
                    required
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Method</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingPayment ? 'Update Payment' : 'Create Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement; 