// This page is for employees only.
// It fetches leads assigned to the logged-in employee using the /api/leads/my endpoint.
// Employees should not access the main leads page or add/edit leads. Only view their own leads here.
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import LeadModal from '../components/LeadModal';
import DocumentUploadModal from '../components/DocumentUploadModal';

// Presence hook for employees
function usePresence(employeeId) {
  useEffect(() => {
    if (!employeeId) return;
    const token = localStorage.getItem('token');
    
    // Set online on mount
    axios.patch(
      'http://localhost:3000/api/employees/status',
      { status: 'online' },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Heartbeat every 2 min
    const interval = setInterval(() => {
      axios.patch(
        'http://localhost:3000/api/employees/status',
        { status: 'online' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }, 2 * 60 * 1000);

    // Set offline on tab close
    const handleOffline = () => {
      navigator.sendBeacon(
        'http://localhost:3000/api/employees/status',
        JSON.stringify({ status: 'offline' })
      );
    };
    window.addEventListener('beforeunload', handleOffline);

    return () => {
      clearInterval(interval);
      handleOffline();
      window.removeEventListener('beforeunload', handleOffline);
    };
  }, [employeeId]);
}

const YourLeads = ({ sidebarCollapsed }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const [updatingId, setUpdatingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedLeadForDocuments, setSelectedLeadForDocuments] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [operations, setOperations] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignType, setAssignType] = useState('operation'); // 'operation' or 'advocate'
  const [showBatchReceiptModal, setShowBatchReceiptModal] = useState(false);
  const [batchReceiptLead, setBatchReceiptLead] = useState(null);
  const [updatingAdvocateField, setUpdatingAdvocateField] = useState(null);
  const [advocates, setAdvocates] = useState([]);
  const callStatusOptions = [
    'Not Called',
    'In Progress',
    'Connected',
    'Not Reachable',
    'Interested',
    'Not Interested',
    'Follow Up',
    'Converted',
    'Closed',
  ];
  const employeeId = currentUser && currentUser.role === 'employee' ? currentUser.employeeId : null;
  const navigate = useNavigate();
  const isAdvocateOrAdmin = currentUser && (['advocate', 'admin', 'super-admin'].includes(currentUser.role));
  usePresence(employeeId);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      console.log('Fetching leads for user:', {
        id: user.id,
        role: user.role,
        employeeId: user.employeeId
      });
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const res = await axios.get('http://localhost:3000/api/leads/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('Fetched leads:', res.data);
      console.log('Leads count:', res.data.length);
      if (res.data.length > 0) {
        console.log('First lead sample:', res.data[0]);
      }
      setLeads(res.data);
    } catch (err) {
      console.error('Error fetching leads:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        // Redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (err.response?.status === 403) {
        toast.error('Access denied. You do not have permission to view leads.');
      } else if (err.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(
          err.response?.data?.message || err.message || 'Error fetching your leads'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (leadId, status) => {
    setUpdatingId(leadId);
    setNewStatus(status);
  };

  const updateCallStatus = async (leadId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3000/api/leads/${leadId}/status`, { callStatus: newStatus }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Status updated successfully');
      setUpdatingId(null);
      setNewStatus('');
      fetchLeads();
      console.log('Updating lead:', leadId, newStatus);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || 'Error updating status'
      );
    }
  };

  // New: Fetch and show lead details in modal
  const handleViewDetails = async (leadId) => {
    console.log('handleViewDetails called with leadId:', leadId);
    setSelectedLeadId(leadId);
    setDetailsLoading(true);
    setDetailsModalOpen(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:3000/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedLead(res.data);
      console.log('Lead details loaded:', res.data);
      console.log('Lead documents:', {
        aadharCardFront: res.data.aadharCardFront,
        aadharCardBack: res.data.aadharCardBack,
        panCard: res.data.panCard,
        passportPhoto: res.data.passportPhoto,
        companyPan: res.data.companyPan,
        incorporationCertificate: res.data.incorporationCertificate,
        msme: res.data.msme,
        partnershipDeed: res.data.partnershipDeed,
        logo: res.data.logo,
        additionalFiles: res.data.additionalFiles
      });
    } catch (err) {
      console.error('Error fetching lead details:', err);
      setSelectedLead(null);
      toast.error('Failed to fetch lead details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedLeadId(null);
    setSelectedLead(null);
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
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
    console.log('Document upload successful, refreshing leads...');
    // Refresh leads data after successful upload
    fetchLeads();
    // Also refresh the selected lead if it's the same one
    if (selectedLead && selectedLead._id === selectedLeadForDocuments?._id) {
      console.log('Refreshing selected lead details...');
      handleViewDetails(selectedLead._id);
    }
  };

  const handleLeadSaved = async (updatedLead) => {
    const token = localStorage.getItem('token');
    try {
      console.log('handleLeadSaved called with:', {
        updatedLead,
        currentUser,
        leadId: updatedLead._id
      });
      
      if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super-admin')) {
        await axios.put(`http://localhost:3000/api/leads/${updatedLead._id}`, updatedLead, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Only send allowed fields for employee
        const allowed = (({ name, email, city, firmType, followUpStatus, additionalNotes, prospectStatus, leadStatus, operationStatus, nextFollowUpDate, descriptionPerClass, services, classes, payments }) => ({ name, email, city, firmType, followUpStatus, additionalNotes, prospectStatus, leadStatus, operationStatus, nextFollowUpDate, descriptionPerClass, services, classes, payments }))(updatedLead);
        
        console.log('Sending employee update with data:', {
          allowed,
          leadId: updatedLead._id,
          currentUserId: currentUser?.id
        });
        
        const response = await axios.put(`http://localhost:3000/api/leads/${updatedLead._id}/employee`, allowed, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log('Employee update response:', response.data);
      }
      toast.success('Lead updated successfully');
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      // Auto-refresh leads after update
      setTimeout(() => {
        fetchLeads();
      }, 500);
    } catch (err) {
      console.error('Error updating lead:', err);
      console.error('Error response:', err?.response?.data);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update lead');
    }
    handleEditModalClose();
  };

  // Fetch Operations users for dropdown
  const fetchOperations = async () => {
    try {
      const res = await axios.get('/api/operations-basic');
      setOperations(res.data.operations || []);
    } catch (err) {
      toast.error('Failed to fetch Operations users');
    }
  };

  // Fetch advocates for dropdown
  const fetchAdvocates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/advocates', {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setAdvocates(res.data.users || []);
    } catch (err) {
      toast.error('Failed to fetch Advocate users');
    }
  };

  // Checkbox logic
  const handleLeadCheckbox = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };
  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leads.map((l) => l._id));
    }
  };

  // Assign to Operations
  const handleSendToOperations = () => {
    setAssignType('operation');
    fetchOperations();
    setShowAssignModal(true);
  };
  const handleSendToAdvocate = () => {
    setAssignType('advocate');
    fetchAdvocates();
    setShowAssignModal(true);
  };

  // Handler for Assign Confirm
  const handleAssignConfirm = async () => {
    if (!selectedOperation) {
      toast.error('Please select a user');
      return;
    }
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      if (assignType === 'operation') {
        await axios.post('http://localhost:3000/api/leads/assign-to-operation', {
          leadIds: selectedLeads,
          operationId: selectedOperation,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Leads sent to Operations successfully!');
      } else if (assignType === 'advocate') {
        await axios.post('http://localhost:3000/api/leads/assign-to-advocate', {
          leadIds: selectedLeads,
          advocateId: selectedOperation,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Leads sent to Advocate successfully!');
      }
      setSelectedLeads([]);
      setShowAssignModal(false);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to assign leads');
    } finally {
      setAssigning(false);
    }
  };

  const handleAdvocateFieldUpdate = async (leadId, field, value) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3000/api/leads/${leadId}/${field}`, { [field]: value }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
      setUpdatingAdvocateField(null);
      fetchLeads();
      console.log(`Updating ${field}:`, leadId, value);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || `Error updating ${field}`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-48'}`}>
        <div className="p-4">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
            <h1 className="text-2xl font-bold text-gray-800">Your Leads</h1>
            <p className="text-sm text-gray-600 mt-1">All leads assigned to you</p>
            {lastUpdateTime && (
              <p className="text-xs text-green-600 mt-1">Last updated: {lastUpdateTime}</p>
            )}
            </div>
            <div className="flex flex-row gap-3 items-center">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm disabled:opacity-50"
                disabled={selectedLeads.length === 0}
                onClick={handleSendToOperations}
              >
                Send to Operations
              </button>
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded shadow hover:bg-yellow-600 transition disabled:opacity-50"
                onClick={handleSendToAdvocate}
                disabled={selectedLeads.length === 0}
              >
                Send to Advocate
              </button>
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
              <p className="text-gray-500">You don't have any leads assigned yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === leads.length && leads.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Lead ID</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Mobile Number(s)</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Brand Name</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Batch Gov. Receipt</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Follow Up Status</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Additional Notes</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Pending for E-Sign</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Govt Payment Done</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Filling Done</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-blue-100 cursor-pointer" onDoubleClick={() => handleViewDetails(lead._id)}>
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead._id)}
                          onChange={() => handleLeadCheckbox(lead._id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-[90px] overflow-hidden text-ellipsis" title={lead._id}>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded border text-gray-700 truncate">
                            {lead._id}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(lead._id);
                              toast.success('Lead ID copied to clipboard!');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs flex-shrink-0"
                            title="Copy Lead ID"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-[120px] overflow-hidden text-ellipsis" title={(lead.mobileNumbers || []).join(', ')}>
                        {(lead.mobileNumbers || []).map((num, i) => (
                          <span key={i} className="inline-block mr-1 bg-blue-50 px-2 py-0.5 rounded text-xs text-blue-800 border border-blue-100 truncate">
                            {num}
                            {i === (lead.mobileNumbers.length - 1) && lead.mobileNumbers.length > 1 && (
                              <span className="ml-1 text-blue-500 font-bold align-middle">+</span>
                            )}
                          </span>
                        ))}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-[90px] overflow-hidden text-ellipsis" title={lead.brandName}>{lead.brandName}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-center max-w-[90px] overflow-hidden text-ellipsis">
                        {lead.batchGovReceiptFile && lead.batchGovReceiptFile.url ? (
                          <a href={lead.batchGovReceiptFile.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                        ) : (
                          <button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs font-semibold"
                            onClick={e => { e.stopPropagation(); setBatchReceiptLead(lead); setShowBatchReceiptModal(true); }}
                          >Upload</button>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-[90px] overflow-hidden text-ellipsis" title={lead.followUpStatus}>{lead.followUpStatus}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 max-w-[140px] overflow-hidden text-ellipsis" title={lead.additionalNotes}>{lead.additionalNotes}</td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className={lead.pendingForESign ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          {lead.pendingForESign ? 'Yes' : 'No'}
                        </span>
                        {isAdvocateOrAdmin && (
                          <button
                            className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${lead.pendingForESign ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
                            disabled={updatingAdvocateField === `${lead._id}-pendingForESign`}
                            onClick={e => { e.stopPropagation(); handleAdvocateFieldUpdate(lead._id, 'pendingForESign', !lead.pendingForESign); }}
                          >{lead.pendingForESign ? 'No' : 'Yes'}</button>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className={lead.govtPaymentDone ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          {lead.govtPaymentDone ? 'Yes' : 'No'}
                        </span>
                        {isAdvocateOrAdmin && (
                          <button
                            className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${lead.govtPaymentDone ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}
                            disabled={updatingAdvocateField === `${lead._id}-govtPaymentDone`}
                            onClick={e => { e.stopPropagation(); handleAdvocateFieldUpdate(lead._id, 'govtPaymentDone', !lead.govtPaymentDone); }}
                          >{lead.govtPaymentDone ? 'No' : 'Yes'}</button>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                        <span className={lead.fillingDone ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          {lead.fillingDone || 'No'}
                        </span>
                        {isAdvocateOrAdmin && (
                          <button
                            className="ml-2 px-2 py-1 rounded text-xs font-semibold bg-blue-500 text-white"
                            disabled={updatingAdvocateField === `${lead._id}-fillingDone`}
                            onClick={e => {
                              e.stopPropagation();
                              const status = prompt('Enter Filling Done Status:', lead.fillingDone || '');
                              if (status !== null) handleAdvocateFieldUpdate(lead._id, 'fillingDone', status);
                            }}
                          >Update</button>
                        )}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap flex gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                          onClick={() => handleDocumentUpload(lead)}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Document Upload
                        </button>
                        <button
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                          onClick={() => handleEditLead(lead)}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Assign to Operations Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                  {assignType === 'operation' ? 'Send Leads to Operations' : 'Send Leads to Advocate'}
                </h2>
                <label className="block mb-2 font-medium">
                  {assignType === 'operation' ? 'Select Operations User' : 'Select Advocate User'}
                </label>
                <select
                  value={selectedOperation}
                  onChange={e => setSelectedOperation(e.target.value)}
                  className="w-full mb-4 p-2 border rounded"
                >
                  <option value="">Select...</option>
                  {(assignType === 'operation' ? operations : advocates).map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => setShowAssignModal(false)}
                    disabled={assigning}
                  >Cancel</button>
                  <button
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleAssignConfirm}
                    disabled={assigning || !selectedOperation}
                  >{assigning ? 'Sending...' : 'Send'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Lead Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden" style={{ maxHeight: '90vh' }}>
            {/* Modern Header */}
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
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl font-bold text-blue-700 border-4 border-white">
                  {selectedLead?.profileImage ? (
                    <img src={selectedLead.profileImage} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (selectedLead?.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
                  )}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-white text-2xl font-bold tracking-tight mb-1">
                    {selectedLead?.name || 'Lead Details'}
                  </h2>
                  <p className="text-blue-100 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {selectedLead?.email || 'No email'}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Active Lead
                    </span>
                    <span className="text-blue-100 text-sm">
                      ID: {selectedLead?._id || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <Tabs selectedLead={selectedLead} detailsLoading={detailsLoading} />
            </div>
          </div>
        </div>
      )}
      {/* Edit Lead Modal */}
      {isEditModalOpen && (
        <LeadModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          onSave={handleLeadSaved}
          lead={editingLead}
          user={currentUser}
        />
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={handleDocumentModalClose}
        lead={selectedLeadForDocuments}
        onUploadSuccess={handleDocumentUploadSuccess}
      />
      {/* Batch Receipt Upload Modal */}
      <DocumentUploadModal
        isOpen={showBatchReceiptModal}
        onClose={() => setShowBatchReceiptModal(false)}
        lead={batchReceiptLead}
        onUploadSuccess={() => { setShowBatchReceiptModal(false); fetchLeads(); }}
        batchGovReceiptMode={true}
      />
    </div>
  );
};

// Tabs component
function Tabs({ selectedLead, detailsLoading }) {
  const [tab, setTab] = React.useState('basic');
  if (detailsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
        </svg>
        <span className="text-blue-700 font-medium">Loading...</span>
      </div>
    );
  }
  if (!selectedLead) {
    return <div className="text-center py-8 text-red-500">No lead found.</div>;
  }
  return (
    <div className="p-8">
      {/* Modern Tab Buttons */}
      <div className="flex gap-1 mb-8 bg-gray-50 rounded-xl p-1">
        <TabBtn icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.485 0 4.797.657 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} label="Basic Info" active={tab==='basic'} onClick={()=>setTab('basic')} />
        <TabBtn icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8h-6a2 2 0 01-2-2V6a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2z" /></svg>} label="Documents" active={tab==='documents'} onClick={()=>setTab('documents')} />
        <TabBtn icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 16v-4" /></svg>} label="Payment" active={tab==='payment'} onClick={()=>setTab('payment')} />
        <TabBtn icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-2" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2 4 4" /></svg>} label="Chat" active={tab==='chat'} onClick={()=>setTab('chat')} />
      </div>
      {/* Tab Content */}
      <div className="min-h-[400px]">
        {tab==='basic' && <BasicTab lead={selectedLead} />}
        {tab==='documents' && <DocumentsTab lead={selectedLead} />}
        {tab==='payment' && <PaymentTab lead={selectedLead} />}
        {tab==='chat' && <ChatTab lead={selectedLead} />}
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex-1 justify-center ${
        active 
          ? 'bg-white text-blue-700 shadow-md border border-gray-200' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-sm'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BasicTab({ lead }) {
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Full Name</div>
            <div className="text-gray-900 font-semibold">{lead.name || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Email Address</div>
            <div className="text-gray-900 font-semibold">{lead.email || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">City</div>
            <div className="text-gray-900 font-semibold">{lead.city || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Brand Name</div>
            <div className="text-gray-900 font-semibold">{lead.brandName || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
        <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Business Information
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Firm Type</div>
            <div className="text-gray-900 font-semibold">{lead.firmType || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Mobile Numbers</div>
            <div className="flex flex-wrap gap-1">
              {(lead.mobileNumbers || []).map((num, i) => (
                <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Information */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Status Information
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Prospect Status</div>
            <div className="text-gray-900 font-semibold">{lead.prospectStatus || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Lead Status</div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {lead.leadStatus || 'N/A'}
            </span>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Operation Status</div>
            <div className="text-gray-900 font-semibold">{lead.operationStatus || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Follow Up Status</div>
            <div className="text-gray-900 font-semibold">{lead.followUpStatus || 'N/A'}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm font-medium text-gray-500 mb-1">Next Follow Up Date</div>
            <div className="text-gray-900 font-semibold">
              {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Services & Classes */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-100">
        <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Services & Classes
        </h3>
        
        {/* Individual Service Sections */}
        {(lead.services || []).length > 0 ? (
          <div className="space-y-4">
            {(lead.services || []).map((service, index) => (
              <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-orange-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    {service}
                  </h4>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Service #{index + 1}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      Service Details
                    </div>
                    <div className="text-gray-900 font-semibold">{service}</div>
                  </div>
                  
                  {service === 'Trademark' && (lead.classes || []).length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Classes
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(lead.classes || []).map((cls, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-200 text-yellow-800 border border-yellow-300">
                            Class {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Service Notes */}
                {lead.descriptionPerClass && (
                  <div className="mt-4 bg-blue-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description & Notes
                    </div>
                    <div className="text-gray-900">{lead.descriptionPerClass}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="text-gray-500 font-medium">No services added yet</p>
            <p className="text-gray-400 text-sm">Services will appear here when added</p>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Additional Information
        </h3>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Additional Notes</div>
          <div className="text-gray-900">{lead.additionalNotes || 'No additional notes'}</div>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({ lead }) {
  // Debug logging
  console.log('DocumentsTab - Lead data:', lead);
  console.log('DocumentsTab - Document fields:', {
    aadharCardFront: lead.aadharCardFront,
    aadharCardBack: lead.aadharCardBack,
    panCard: lead.panCard,
    passportPhoto: lead.passportPhoto,
    companyPan: lead.companyPan,
    incorporationCertificate: lead.incorporationCertificate,
    msme: lead.msme,
    partnershipDeed: lead.partnershipDeed,
    logo: lead.logo,
    additionalFiles: lead.additionalFiles,
    batchGovReceiptFile: lead.batchGovReceiptFile
  });

  function getFileIcon(name) {
    if (!name) return null;
    const ext = name.split('.').pop().toLowerCase();
    if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) return <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    if (["pdf"].includes(ext)) return <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 16h8M8 12h8M8 8h8"/></svg>;
    return <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
  }

  const docFields = [
    { key: 'aadharCardFront', label: 'Aadhar Card Front', icon: '🆔' },
    { key: 'aadharCardBack', label: 'Aadhar Card Back', icon: '🆔' },
    { key: 'panCard', label: 'PAN Card', icon: '📄' },
    { key: 'passportPhoto', label: 'Passport Size Photo', icon: '📷' },
    { key: 'companyPan', label: 'Company PAN', icon: '🏢' },
    { key: 'incorporationCertificate', label: 'Incorporation Certificate', icon: '📋' },
    { key: 'msme', label: 'MSME', icon: '🏭' },
    { key: 'partnershipDeed', label: 'Partnership/ Pvt. Ltd/ LLP Deed', icon: '📜' },
    { key: 'logo', label: 'Logo', icon: '🎨' },
  ];

  // Filter only uploaded documents
  const uploadedDocs = docFields.filter(field => lead[field.key] && lead[field.key].url);
  const additionalFiles = lead.additionalFiles && lead.additionalFiles.length > 0 ? lead.additionalFiles : [];

  console.log('DocumentsTab - Uploaded docs count:', uploadedDocs.length);
  console.log('DocumentsTab - Additional files count:', additionalFiles.length);

  const handleDocumentClick = (url, fileName) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Drafting files (Draft, POA, UA)
  const draftingFiles = lead.draftingFiles || {};
  const draftingFields = [
    { key: 'draft', label: 'Draft', icon: '📝' },
    { key: 'poa', label: 'POA', icon: '📄' },
    { key: 'ua', label: 'UA', icon: '📄' },
  ];

  return (
    <div className="space-y-6">
      {/* Drafting Files */}
      {(draftingFiles.draft || draftingFiles.poa || draftingFiles.ua) && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100">
          <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Drafting Documents
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {draftingFields.map(field => (
              draftingFiles[field.key] && draftingFiles[field.key].url && (
                <div
                  key={field.key}
                  className="bg-white rounded-lg p-4 shadow-sm border border-yellow-100 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => handleDocumentClick(draftingFiles[field.key].url, draftingFiles[field.key].name)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">{getFileIcon(draftingFiles[field.key].name)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">{field.label}</div>
                      <div className="text-xs text-gray-500 truncate">{draftingFiles[field.key].name}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Batch Government Receipt */}
      {lead.batchGovReceiptFile && lead.batchGovReceiptFile.url && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Batch Government Receipt
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div 
              className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => handleDocumentClick(lead.batchGovReceiptFile.url, lead.batchGovReceiptFile.name)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {getFileIcon(lead.batchGovReceiptFile.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    Batch Government Receipt
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {lead.batchGovReceiptFile.name}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Documents */}
      {uploadedDocs.length > 0 ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Uploaded Documents ({uploadedDocs.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {uploadedDocs.map(field => (
              <div 
                key={field.key} 
                className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => handleDocumentClick(lead[field.key].url, lead[field.key].name)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(lead[field.key].name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {field.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {lead[field.key].name}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Documents Uploaded</h3>
            <p className="text-gray-500">No documents have been uploaded for this lead yet.</p>
          </div>
        </div>
      )}

      {/* Additional Files */}
      {additionalFiles.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Additional Files ({additionalFiles.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {additionalFiles.map((file, i) => (
              <div 
                key={i} 
                className="bg-white rounded-lg p-4 shadow-sm border border-green-100 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => handleDocumentClick(file.url, file.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      Additional File
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {file.name}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentTab({ lead }) {
  console.log('PaymentTab rendered for lead:', lead && lead._id); // DEBUG LOG
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);

  useEffect(() => {
    try {
      console.log('useEffect for claims called, lead:', lead); // DEBUG LOG
      if (lead && lead._id) {
        setClaimsLoading(true);
        const token = localStorage.getItem('token');
        axios.get(`http://localhost:3000/api/leads/${lead._id}/claims`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
          setClaims(res.data.claims || []);
          console.log('Claims fetched:', res.data.claims); // DEBUG LOG
        })
        .catch((err) => {
          setClaims([]);
          console.error('Claims API error:', err); // ERROR LOG
        })
        .finally(() => setClaimsLoading(false));
      }
    } catch (err) {
      console.error('useEffect error:', err); // ERROR LOG
    }
  }, [lead]);

  return (
    <div className="space-y-6">
      {/* Multiple Payments Section */}
      {lead.payments && lead.payments.length > 0 ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Payment Entries ({lead.payments.length})
          </h3>
          
          <div className="space-y-4">
            {lead.payments.map((payment, index) => {
              const total = (
                Number(payment.govtFees || 0) +
                Number(payment.advocateFees || 0) +
                Number(payment.userStamp || 0) +
                Number(payment.otherFees || 0)
              );
              
              return (
                <div key={payment.id || index} className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-blue-700">Payment #{index + 1}</h4>
                    <span className="text-xs text-gray-500">
                      {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">🏛️ Govt Fees:</span>
                      <span className="font-medium text-gray-900">₹{Number(payment.govtFees || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">⚖️ Advocate Fees:</span>
                      <span className="font-medium text-gray-900">₹{Number(payment.advocateFees || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">📝 User Stamp:</span>
                      <span className="font-medium text-gray-900">₹{Number(payment.userStamp || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">💵 Other Fees:</span>
                      <span className="font-medium text-gray-900">₹{Number(payment.otherFees || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="font-semibold text-blue-700">Payment Total:</span>
                    <span className="bg-blue-100 text-blue-800 font-bold rounded-lg px-3 py-1">
                      ₹{total.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Grand Total */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-blue-900">Grand Total:</span>
              <span className="bg-blue-600 text-white font-bold rounded-lg px-4 py-2 text-xl">
                ₹{(
                  lead.payments.reduce((total, payment) => 
                    total + 
                    Number(payment.govtFees || 0) +
                    Number(payment.advocateFees || 0) +
                    Number(payment.userStamp || 0) +
                    Number(payment.otherFees || 0), 0
                  )
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Payment Entries</h3>
            <p className="text-gray-500">No payment entries have been added for this lead yet.</p>
          </div>
        </div>
      )}
    

      {/* Payment Claims History (IMPROVED) */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-100 mt-6">
        <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Payment Claims History
        </h3>
        {claimsLoading ? (
          <div className="text-emerald-700">Loading claims...</div>
        ) : claims.length === 0 ? (
          <div className="text-gray-500">No payment claims for this lead yet.</div>
        ) : (
          <div>
            <div className="mb-3 text-emerald-800 font-semibold">Total Claims: <span className="bg-emerald-200 text-emerald-900 rounded px-2 py-0.5">{claims.length}</span></div>
            <ul className="space-y-4">
              {claims.map((claim, idx) => (
                <li key={claim._id || idx} className="bg-white rounded-xl p-5 shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="bg-emerald-100 text-emerald-800 font-bold rounded-lg px-4 py-2 text-lg shadow flex-shrink-0">₹{Number(claim.amount).toLocaleString()}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-gray-700 text-base font-semibold truncate">{claim.claimedBy?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500 truncate">{claim.claimedBy?.employeeId ? `ID: ${claim.claimedBy.employeeId}` : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[120px]">
                    <span className={`text-xs font-bold rounded px-2 py-1 ${claim.status === 'verified' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{claim.status}</span>
                    <span className="text-xs text-gray-500">{claim.claimedAt ? new Date(claim.claimedAt).toLocaleString() : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatTab({ lead }) {
  return (
    <div className="space-y-2">
      {lead.chat && lead.chat.length > 0 ? (
        <ul className="list-disc ml-6 text-slate-700">
          {lead.chat.map((msg, i) => (
            <li key={i}><b>{msg.sender?.name || 'User'}:</b> {msg.message} <span className="text-xs text-slate-400">({msg.sentAt ? msg.sentAt.slice(0, 19).replace('T', ' ') : ''})</span></li>
          ))}
        </ul>
      ) : <span className="text-slate-400">No chat messages.</span>}
    </div>
  );
}

export { Tabs };
export default YourLeads; 