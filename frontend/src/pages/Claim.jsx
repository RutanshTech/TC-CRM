import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Header from '../components/Header';

const Claim = ({ sidebarCollapsed = false }) => {
  const [availablePayments, setAvailablePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingPayment, setClaimingPayment] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [userLeads, setUserLeads] = useState([]);
  const [showUserLeads, setShowUserLeads] = useState(false);
  const [leadPaymentStatus, setLeadPaymentStatus] = useState(null);
  const [checkingLeadStatus, setCheckingLeadStatus] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    fetchAvailablePayments();
    fetchUserLeads();
  }, []);

  const fetchAvailablePayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('tc-crm.vercel.app/api/payments/available', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setAvailablePayments(response.data.payments);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch available payments');
      console.error('Error fetching payments:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLeads = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('tc-crm.vercel.app/api/leads/assigned', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserLeads(response.data.assignedLeads || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch user leads');
      console.error('Error fetching user leads:', error.response?.data || error);
    }
  };

  const handleClaimPayment = (payment) => {
    setClaimingPayment(payment);
    setLeadId('');
    setShowClaimModal(true);
  };

  const checkLeadPaymentStatus = async (leadId) => {
    if (!leadId.trim()) {
      setLeadPaymentStatus(null);
      return;
    }

    try {
      setCheckingLeadStatus(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `tc-crm.vercel.app/api/payments/check-lead/${leadId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setLeadPaymentStatus(response.data);
    } catch (error) {
      setLeadPaymentStatus({
        canClaim: false,
        message: error.response?.data?.message || 'Failed to check lead status',
        totalAvailablePayment: 0
      });
    } finally {
      setCheckingLeadStatus(false);
    }
  };

  const submitClaim = async () => {
    if (!leadId.trim()) {
      toast.error('Please select a lead');
      return;
    }

    // Check if lead has sufficient payment
    if (!leadPaymentStatus || !leadPaymentStatus.canClaim) {
      toast.error(leadPaymentStatus?.message || 'Lead does not have sufficient payment');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `tc-crm.vercel.app/api/payments/${claimingPayment._id}/claim-with-lead`,
        { leadId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Show success message with claim details
      const claimInfo = response.data;
      let successMessage = `Payment claimed successfully! Claimed: ₹${claimInfo.payment.claimedAmount}, Remaining in lead: ₹${claimInfo.leadInfo.remainingAmount}`;
      
      if (claimInfo.remainingPayment) {
        successMessage += `, ₹${claimInfo.remainingPayment.amount} returned to Payment Claims`;
      }
      
      toast.success(successMessage);
      
      setShowClaimModal(false);
      setClaimingPayment(null);
      setLeadId('');
      setLeadPaymentStatus(null);
      fetchAvailablePayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to claim payment');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="flex-1 bg-gray-100 min-h-screen">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-48'}`}>
        <div className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Payment Claims</h1>
              <p className="text-gray-600 mt-2">View and claim available payments for your leads</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Removed refresh and notification icons and their buttons */}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : availablePayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💰</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Available Payments</h3>
              <p className="text-gray-500">There are currently no payments available for claiming.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availablePayments.map((payment) => (
                <div key={payment._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {formatAmount(payment.amount)}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {payment.paymentMethod.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Available
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {payment.accountName && (
                      <div className="text-sm">
                        <span className="text-gray-500">Account:</span>
                        <span className="ml-2 text-gray-700 font-medium">{payment.accountName}</span>
                      </div>
                    )}
                    {payment.description && (
                      <div className="text-sm">
                        <span className="text-gray-500">Description:</span>
                        <span className="ml-2 text-gray-700">{payment.description}</span>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-700">{formatDate(payment.createdAt)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimPayment(payment)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Claim Payment
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification Center */}
      {/* {showNotifications && (
        <NotificationCenter 
          isOpen={showNotifications} 
          onClose={() => setShowNotifications(false)}
          onNotificationRead={fetchUnreadNotifications}
        />
      )} */}

      {/* Claim Modal */}
      {showClaimModal && claimingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Claim Payment</h2>
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">Payment Details</h3>
                <div className="space-y-1 text-sm">
                  <div><span className="text-blue-600">Amount:</span> {formatAmount(claimingPayment.amount)}</div>
                  <div><span className="text-blue-600">Method:</span> {claimingPayment.paymentMethod.replace('_', ' ')}</div>
                  <div><span className="text-blue-600">Date:</span> {formatDate(claimingPayment.createdAt)}</div>
                </div>
              </div>

              <div className="relative flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={leadId}
                  onChange={(e) => {
                    setLeadId(e.target.value);
                    if (e.target.value.trim()) {
                      checkLeadPaymentStatus(e.target.value);
                    } else {
                      setLeadPaymentStatus(null);
                    }
                  }}
                  placeholder="Enter or paste your lead ID here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowUserLeads(!showUserLeads)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-r-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  title="View your leads"
                >
                  📋
                </button>
              </div>
              {leadPaymentStatus === false && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  <span className="text-red-700 text-sm font-medium">This lead has no payment or payment is less than ₹1.</span>
                </div>
              )}
              {/* Lead Payment Status */}
              {checkingLeadStatus && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-700 text-sm">Checking lead payment status...</span>
                </div>
              )}
              <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                <div className="font-semibold text-yellow-800 mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
                  Important:
                </div>
                <ul className="list-disc pl-5 text-yellow-900 text-sm space-y-1">
                  <li>Lead must have payment ≥ ₹1 to be eligible for claiming</li>
                  <li>Only the available amount in the lead will be claimed</li>
                  <li>Remaining amount will stay in the lead for future claims</li>
                  <li>Make sure you select the correct lead for this payment</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClaimModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={submitClaim}
                disabled={!leadId.trim() || !leadPaymentStatus?.canClaim}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Claim Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Claim; 