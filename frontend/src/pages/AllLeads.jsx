import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CheckCircle, AlertCircle, User } from 'lucide-react';
import LeadModal from '../components/LeadModal';

const AllLeads = ({ sidebarCollapsed }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const tableContainerRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    // Save scroll position
    const container = tableContainerRef.current;
    const scrollTop = container ? container.scrollTop : 0;
    const scrollLeft = container ? container.scrollLeft : 0;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://tc-crm.vercel.app/api/leads/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
      // Restore scroll position after a short delay
      setTimeout(() => {
        if (container) {
          container.scrollTop = scrollTop;
          container.scrollLeft = scrollLeft;
        }
      }, 0);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Error fetching leads'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUploadModal = (lead) => {
    setSelectedLead(lead);
    setShowUploadModal(true);
    setSelectedFile(null);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setSelectedLead(null);
    setSelectedFile(null);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedLead) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('additionalFiles', selectedFile);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`https://tc-crm.vercel.app/api/leads/${selectedLead._id}/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('File uploaded successfully!');
      handleCloseUploadModal();
      fetchLeads();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Error uploading file'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDetailModal = (lead) => {
    setDetailLead(lead);
    setShowDetailModal(true);
  };
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setDetailLead(null);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${sidebarCollapsed ? 'ml-12' : 'ml-44'} transition-all duration-300`}>
      <Header />
      <div className="p-6 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 All Leads</h1>
              <p className="text-gray-600 mt-2">All leads in the system (view only, no edit)</p>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <svg className="h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 018 0v2m-4-4V7a4 4 0 10-8 0v6a4 4 0 008 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">No leads found</h2>
              <p className="text-gray-500">There are no leads in the system.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.map((lead, idx) => (
                <div
                  key={lead._id || idx}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5 flex flex-col gap-2 hover:shadow-2xl transition-all duration-200 group relative"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-gray-400">
                      {(currentUser?.role === 'super-admin' || (currentUser?.access && currentUser?.access.copy)) 
                        ? lead._id 
                        : 'No Copy Access'}
                    </span>
                    {lead.brandName && (
                      <span className="flex items-center gap-1 font-bold text-blue-900 text-lg">
                        <User size={16} className="inline-block text-blue-400" />
                        {lead.brandName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {lead.leadStatus && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold text-xs">
                        <CheckCircle size={12} className="inline-block" />
                        {lead.leadStatus}
                      </span>
                    )}
                    {lead.prospectStatus && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">
                        <AlertCircle size={12} className="inline-block" />
                        {lead.prospectStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    {Object.keys(lead).map((key) => {
                      if (['_id', 'brandName', 'leadStatus', 'prospectStatus'].includes(key)) return null;
                      const value = lead[key];
                      return (
                        <div key={key} className="flex gap-2 items-start">
                          <span className="font-semibold text-gray-700 min-w-[110px] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-gray-800 break-all">
                            {typeof value === 'object' && value !== null
                              ? <span className="text-gray-400">{JSON.stringify(value)}</span>
                              : String(value ?? '')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-auto">
            <p className="text-red-500 mb-2">DEBUG: Modal is open!</p>
            <h2 className="text-lg font-bold mb-4 text-gray-800">Upload File for Lead</h2>
            <input type="file" onChange={handleFileChange} className="mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={handleCloseUploadModal} className="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
              <button onClick={handleFileUpload} disabled={!selectedFile || uploading} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllLeads; 