import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const OperationsPayment = ({ sidebarCollapsed }) => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [paymentReceiptReceived, setPaymentReceiptReceived] = useState(false);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    setUser(currentUser);
    
    if (currentUser && currentUser.role === 'operation') {
      fetchOperationData();
    }
  }, []);

  const fetchOperationData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://tc-crm.vercel.app/api/operations/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setPaymentReceiptReceived(response.data.paymentReceiptReceived || false);
      }
    } catch (error) {
      console.error('Error fetching operation data:', error);
      toast.error('Error loading operation data');
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, checked } = e.target;
    setPaymentReceiptReceived(checked);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://tc-crm.vercel.app/api/operations/${user.id}`, {
        paymentReceiptReceived: paymentReceiptReceived
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Payment settings saved successfully!');
    } catch (error) {
      console.error('Error saving operation data:', error);
      toast.error('Error saving payment settings');
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${sidebarCollapsed ? 'ml-12' : 'ml-44'} transition-all duration-300`}>
      <Header />
      <div className="p-6 pt-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">💰 Payment</h1>
            <p className="text-gray-600 mt-2">Manage payment receipt and processing</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Settings</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="paymentReceiptReceived"
                      checked={paymentReceiptReceived}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    />
                    <span className="text-gray-700 font-medium">Payment Receipt Received</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2 ml-8">
                    Mark when payment receipt has been received and processed
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Payment Processing:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Payment verification</li>
                    <li>• Receipt documentation</li>
                    <li>• Transaction recording</li>
                    <li>• Client notification</li>
                    <li>• Service activation</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsPayment; 