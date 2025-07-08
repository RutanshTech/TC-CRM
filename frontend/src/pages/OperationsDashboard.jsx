import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardCards from '../components/DashboardCards';
import Header from '../components/Header';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const OperationsDashboard = ({ sidebarCollapsed }) => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // Form data for different tabs
  const [formData, setFormData] = useState({
    // Notifications
    notifications: false,
    
    // Drafting
    receivedForDrafting: false,
    
    // Payment
    paymentReceiptReceived: false,
    
    // Filling
    requestForFilling: false,
    
    // Client
    clientUpdation: false,
    
    // Leads
    leads: false,
    completeLead: false,
    
    // Data
    dataUpdationNotify: false,
    
    // Communication
    chat: false,
    
    // Lead Management
    leadEditOption: false,
    
    // Documents
    upload: false,
    draft: false,
    poa: false,
    ua: false,
    
    // Sales Person
    salesPersonName: '',
    salesPersonId: '',
    
    // Filling Text
    fillingText: '',
    
    // Clients
    clients: false,
    afterPaymentMarkDoneLeadsMoveToClients: false,
    leadTransferToAdvocate: false,
    
    // Log
    log: {
      who: '',
      what: '',
      when: new Date(),
      where: ''
    }
  });

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
        setFormData({
          notifications: response.data.notifications || false,
          receivedForDrafting: response.data.receivedForDrafting || false,
          paymentReceiptReceived: response.data.paymentReceiptReceived || false,
          requestForFilling: response.data.requestForFilling || false,
          clientUpdation: response.data.clientUpdation || false,
          leads: response.data.leads || false,
          completeLead: response.data.completeLead || false,
          dataUpdationNotify: response.data.dataUpdationNotify || false,
          chat: response.data.chat || false,
          leadEditOption: response.data.leadEditOption || false,
          upload: response.data.upload || false,
          draft: response.data.draft || false,
          poa: response.data.poa || false,
          ua: response.data.ua || false,
          salesPersonName: response.data.salesPersonName || '',
          salesPersonId: response.data.salesPersonId || '',
          fillingText: response.data.fillingText || '',
          clients: response.data.clients || false,
          afterPaymentMarkDoneLeadsMoveToClients: response.data.afterPaymentMarkDoneLeadsMoveToClients || false,
          leadTransferToAdvocate: response.data.leadTransferToAdvocate || false,
          log: response.data.log || { who: '', what: '', when: new Date(), where: '' }
        });
      }
    } catch (error) {
      console.error('Error fetching operation data:', error);
      toast.error('Error loading operation data');
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('log.')) {
      const logField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        log: {
          ...prev.log,
          [logField]: type === 'date' ? new Date(value) : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/operations/${user.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Operation settings saved successfully!');
    } catch (error) {
      console.error('Error saving operation data:', error);
      toast.error('Error saving operation settings');
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: '\ud83d\udd14' },
    { id: 'drafting', label: 'Drafting', icon: '\ud83d\udcdd' },
    { id: 'payment', label: 'Payment', icon: '\ud83d\udcb0' },
    { id: 'filling', label: 'Filling', icon: '\ud83d\udccb' },
    { id: 'client', label: 'Client', icon: '\ud83d\udc64' },
    { id: 'leads', label: 'Leads', icon: '\ud83c\udfaf' },
    { id: 'data', label: 'Data', icon: '\ud83d\udcca' },
    { id: 'communication', label: 'Communication', icon: '\ud83d\udcac' },
    { id: 'documents', label: 'Documents', icon: '\ud83d\udcc4' },
    { id: 'sales', label: 'Sales Person', icon: '\ud83d\udc68\u200d\ud83d\udcbc' },
    { id: 'filling-text', label: 'Filling Text', icon: '\u270d\ufe0f' },
    { id: 'clients', label: 'Clients', icon: '\ud83c\udfe2' },
    { id: 'log', label: 'Log', icon: '\ud83d\udcdd' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'notifications':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Notification Settings</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="notifications"
                  checked={formData.notifications}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-gray-700 font-medium">Enable Notifications</span>
              </label>
              <p className="text-sm text-gray-500 mt-2">Receive notifications for important updates and activities</p>
            </div>
          </div>
        );

      case 'drafting':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Drafting Settings</h3>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="receivedForDrafting"
                  checked={formData.receivedForDrafting}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-gray-700 font-medium">Enable Drafting</span>
              </label>
              <p className="text-sm text-gray-500 mt-2">Receive drafting requests and notifications</p>
            </div>
          </div>
        );
      // ... rest of the file ...
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${sidebarCollapsed ? 'ml-12' : 'ml-44'} transition-all duration-300`}>
      <Header />
      <div className="p-6 pt-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900"> Operations Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage operation settings and notifications</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6">
              <div className="flex space-x-4 mb-6">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="mr-2">{tab.icon}</span>{tab.label}
                  </button>
                ))}
              </div>
              {renderTabContent()}
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

export default OperationsDashboard; 