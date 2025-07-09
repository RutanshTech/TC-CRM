import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import LeadTable from '../components/LeadTable';
import DocumentUploadModal from '../components/DocumentUploadModal';
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Tabs } from './YourLeads';

const OperationsTotalLeads = ({ sidebarCollapsed }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedLeadForDocuments, setSelectedLeadForDocuments] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    // Only allow operations users
    if (!currentUser || currentUser.role !== 'operation') {
      window.location.href = '/';
      return;
    }
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://tc-crm.vercel.app/api/leads/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLeads(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Error fetching leads"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = (lead) => {
    setSelectedLeadForDocuments(lead);
    setIsDocumentModalOpen(true);
  };

  const handleDocumentModalClose = () => {
    setIsDocumentModalOpen(false);
    setSelectedLeadForDocuments(null);
  };

  const handleDocumentUploadSuccess = () => {
    fetchLeads();
  };

  // Details modal logic
  const handleViewDetails = async (leadId) => {
    setDetailsModalOpen(true);
    setSelectedLeadForDetails(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`https://tc-crm.vercel.app/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedLeadForDetails(res.data);
    } catch (err) {
      toast.error('Failed to fetch lead details');
      setDetailsModalOpen(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedLeadForDetails(null);
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Total Leads (Operations Only)</h1>
              <p className="text-sm text-gray-600 mt-1">All leads in the system. View only. No edit.</p>
            </div>
          </div>
          <LeadTable 
            leads={leads} 
            onDocumentUpload={handleDocumentUpload}
            loading={loading}
            onRowDoubleClick={lead => handleViewDetails(lead._id)}
            hideEditButton={true}
          />
        </div>
      </div>
      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={handleDocumentModalClose}
        lead={selectedLeadForDocuments}
        onUploadSuccess={handleDocumentUploadSuccess}
      />
      {/* View Details Modal (read-only) */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden" style={{ maxHeight: '90vh' }}>
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-8 py-6 relative">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={closeDetailsModal} 
                  className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all duration-200"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl font-bold text-blue-700 border-4 border-white">
                  {selectedLeadForDetails?.profileImage ? (
                    <img src={selectedLeadForDetails.profileImage} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (selectedLeadForDetails?.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-white text-2xl font-bold tracking-tight mb-1">
                    {selectedLeadForDetails?.name || 'Lead Details'}
                  </h2>
                  <p className="text-blue-100 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {selectedLeadForDetails?.email || 'No email'}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Active Lead
                    </span>
                    <span className="text-blue-100 text-sm">
                      ID: {selectedLeadForDetails?._id?.slice(-8) || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <Tabs selectedLead={selectedLeadForDetails} detailsLoading={!selectedLeadForDetails} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsTotalLeads; 