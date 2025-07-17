import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import LeadTable from '../components/LeadTable';
import LeadModal from '../components/LeadModal';
import DocumentUploadModal from '../components/DocumentUploadModal';
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from 'react-router-dom';
import { Tabs } from './YourLeads';
import Modal from 'react-modal';

const Leads = ({ sidebarCollapsed }) => {
  // Only admin and super-admin should access this page.
  // Employees are redirected to /your-leads, where they see only their assigned leads.
  // This is because the /leads page and its APIs (add/edit/all) are restricted to admin/super-admin.
  const [leads, setLeads] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedLeadForDocuments, setSelectedLeadForDocuments] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  // Add state for selected leads
  const [selectedLeads, setSelectedLeads] = useState([]);
  const selectAllRef = useRef();
  const [advocates, setAdvocates] = useState([]);
  const [showAdvocateModal, setShowAdvocateModal] = useState(false);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLead, setDetailLead] = useState(null);

  useEffect(() => {
    // Redirect employees to /your-leads. They should not access this page or its APIs.
    if (currentUser && currentUser.role === 'employee') {
      navigate('/your-leads');
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
      console.log(res.data);
      
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Error fetching leads"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = () => {
    setEditingLead(null);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingLead(null);
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
    // Refresh leads data after successful upload
    fetchLeads();
  };

  const handleLeadSaved = async (newLead) => {
    // Always include brandName and mobileNumbers in the payload
    const payload = { ...newLead };
    const token = localStorage.getItem("token");
    try {
      let res;
      if (newLead._id) {
        // Edit mode: Update existing lead
        res = await axios.put(
          `https://tc-crm.vercel.app/api/leads/${newLead._id}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // Add mode: Create new lead
        res = await axios.post(
          "https://tc-crm.vercel.app/api/leads/led",
          newLead,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      console.log(res.data);
      await fetchLeads();
    } catch (err) {
      console.log("Lead Save Error:", err, err.response?.data);
      toast.error(
        err.response?.data?.message || err.message || "Error saving lead"
      );
    }
    handleModalClose();
  };

  // Fetch lead details for view-only modal
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

  const handleLeadCheckbox = (leadId) => {
    // Copy access check removed for Operation users as per new requirement
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    // Copy access check removed for Operation users as per new requirement
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map((lead) => lead._id));
    }
  };

  const fetchAdvocates = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      let url = 'https://tc-crm.vercel.app/api/advocates';
      if (user?.role === 'operation') {
        url = 'https://tc-crm.vercel.app/api/advocates/for-operation';
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdvocates(res.data.users);
    } catch (err) {
      toast.error('Failed to fetch advocates');
    }
  };

  const handleSendToAdvocate = async () => {
    if (selectedLeads.length === 0) return;
    await fetchAdvocates();
    setShowAdvocateModal(true);
  };

  const handleConfirmSendToAdvocate = async () => {
    if (!selectedAdvocate) {
      toast.error('Please select an advocate');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://tc-crm.vercel.app/api/leads/assign-to-advocate',
        { leadIds: selectedLeads, advocateId: selectedAdvocate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Leads sent to Advocate!');
      setSelectedLeads([]);
      setShowAdvocateModal(false);
      setSelectedAdvocate(null);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to send leads to advocate');
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
              <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your leads and prospects</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {/* Add Send to Advocate button for operation users */}
            {currentUser?.role === 'operation' && (
              <div className="mb-4">
                <button
                  className="bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600 transition disabled:opacity-50"
                  onClick={handleSendToAdvocate}
                  disabled={selectedLeads.length === 0}
                >
                  Send to Advocate
                </button>
              </div>
            )}
            <LeadTable 
              leads={leads} 
              loading={loading} 
              onEdit={handleEditLead} 
              onViewDetails={handleViewDetails} 
              onDocumentUpload={handleDocumentUpload} 
              selectedLeads={currentUser?.role === 'operation' ? selectedLeads : undefined}
              handleLeadCheckbox={currentUser?.role === 'operation' ? handleLeadCheckbox : undefined}
              handleSelectAll={currentUser?.role === 'operation' ? handleSelectAll : undefined}
              sidebarCollapsed={sidebarCollapsed}
              onRowDoubleClick={lead => handleViewDetails(lead._id)}
              hasCopyAccess={currentUser?.role === 'super-admin' || (currentUser?.access && currentUser?.access.copy)}
            />
          </div>
        </div>
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleLeadSaved}
        lead={editingLead}
        user={currentUser}
      />

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
            {/* Modern Header and Tabs, same as employee */}
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
            {/* Content: Tabs (Basic Info, Documents, Payment, Chat) */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <Tabs selectedLead={selectedLeadForDetails} detailsLoading={!selectedLeadForDetails} />
            </div>
          </div>
        </div>
      )}
      <Modal
        isOpen={showAdvocateModal}
        onRequestClose={() => setShowAdvocateModal(false)}
        contentLabel="Select Advocate"
        ariaHideApp={false}
        className="fixed inset-0 flex items-center justify-center z-50"
        overlayClassName="fixed inset-0 bg-black bg-opacity-40 z-40"
      >
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
          <h2 className="text-lg font-bold mb-4">Select Advocate</h2>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
            value={selectedAdvocate || ''}
            onChange={e => setSelectedAdvocate(e.target.value)}
          >
            <option value="">-- Select Advocate --</option>
            {(advocates || []).map(adv => (
              <option key={adv._id} value={adv._id}>{adv.name} ({adv.email})</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              onClick={() => setShowAdvocateModal(false)}
            >Cancel</button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleConfirmSendToAdvocate}
              disabled={!selectedAdvocate}
            >Send</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Leads;
