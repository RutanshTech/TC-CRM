import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const OperationsClients = ({ sidebarCollapsed }) => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState(false);
  const [afterPaymentMarkDoneLeadsMoveToClients, setAfterPaymentMarkDoneLeadsMoveToClients] = useState(false);
  const [leadTransferToAdvocate, setLeadTransferToAdvocate] = useState(false);

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
      const response = await axios.get(`http://localhost:3000/api/operations/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setClients(response.data.clients || false);
        setAfterPaymentMarkDoneLeadsMoveToClients(response.data.afterPaymentMarkDoneLeadsMoveToClients || false);
        setLeadTransferToAdvocate(response.data.leadTransferToAdvocate || false);
      }
    } catch (error) {
      console.error('Error fetching operation data:', error);
      toast.error('Error loading operation data');
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, checked } = e.target;
    switch (name) {
      case 'clients':
        setClients(checked);
        break;
      case 'afterPaymentMarkDoneLeadsMoveToClients':
        setAfterPaymentMarkDoneLeadsMoveToClients(checked);
        break;
      case 'leadTransferToAdvocate':
        setLeadTransferToAdvocate(checked);
        break;
      default:
        break;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/operations/${user.id}`, {
        clients: clients,
        afterPaymentMarkDoneLeadsMoveToClients: afterPaymentMarkDoneLeadsMoveToClients,
        leadTransferToAdvocate: leadTransferToAdvocate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Clients settings saved successfully!');
    } catch (error) {
      console.error('Error saving operation data:', error);
      toast.error('Error saving clients settings');
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${sidebarCollapsed ? 'ml-12' : 'ml-44'} transition-all duration-300`}>
      <Header />
      <div className="p-6 pt-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">🏢 Clients</h1>
            <p className="text-gray-600 mt-2">Manage client conversion and transfer settings</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Clients Settings</h3>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="clients"
                      checked={clients}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    />
                    <span className="text-gray-700 font-medium">Client Management</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2 ml-8">
                    Enable client management functionality
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="afterPaymentMarkDoneLeadsMoveToClients"
                      checked={afterPaymentMarkDoneLeadsMoveToClients}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    />
                    <span className="text-gray-700 font-medium">Auto-convert Leads to Clients</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2 ml-8">
                    Automatically move leads to clients after payment completion
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="leadTransferToAdvocate"
                      checked={leadTransferToAdvocate}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-5 w-5"
                    />
                    <span className="text-gray-700 font-medium">Lead Transfer to Advocate</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-2 ml-8">
                    Enable automatic lead transfer to advocate after conversion
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Client Workflow:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Lead qualification and conversion</li>
                    <li>• Payment processing and verification</li>
                    <li>• Client onboarding and setup</li>
                    <li>• Service delivery and tracking</li>
                    <li>• Ongoing client support</li>
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

export default OperationsClients; 