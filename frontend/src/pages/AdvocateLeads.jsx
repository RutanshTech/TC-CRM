import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PencilIcon = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
const UploadIcon = () => (
  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
);

const AdvocateLeads = ({ sidebarCollapsed }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/leads/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data);
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
      await axios.post(`http://localhost:3000/api/leads/${selectedLead._id}/upload`, formData, {
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

  const handleToggleStatus = async (lead, field) => {
    const newValue = !lead[field];
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3000/api/leads/${lead._id}/advocate-status`, {
        [field]: newValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status updated!');
      fetchLeads();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-48'}`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">All Leads</h1>
              <p className="text-sm text-gray-600 mt-1">All leads overview for Advocate</p>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-40 text-gray-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-gray-500">No leads found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {leads.map((lead) => (
                <div key={lead._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex flex-col gap-2 hover:shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-400">Mobile Number(s)</span>
                    <span className="font-mono text-blue-700 text-sm underline cursor-pointer">{lead.number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Brand Name</span>
                    <span className="font-semibold text-gray-800 text-sm">{lead.brandName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Follow Up Status</span>
                    <span className="text-gray-700 text-sm">{lead.followUpStatus || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Additional Notes</span>
                    <span className="text-gray-700 text-sm">{lead.additionalNotes || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Pending for E-Sign</span>
                    <button
                      className={`text-xs font-bold px-2 py-1 rounded focus:outline-none transition-colors duration-150 ${lead.pendingESign ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                      onClick={() => handleToggleStatus(lead, 'pendingESign')}
                    >
                      {lead.pendingESign ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Govt Payment Done</span>
                    <button
                      className={`text-xs font-bold px-2 py-1 rounded focus:outline-none transition-colors duration-150 ${lead.govtPaymentDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                      onClick={() => handleToggleStatus(lead, 'govtPaymentDone')}
                    >
                      {lead.govtPaymentDone ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Filling Done</span>
                    <button
                      className={`text-xs font-bold px-2 py-1 rounded focus:outline-none transition-colors duration-150 ${lead.fillingDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
                      onClick={() => handleToggleStatus(lead, 'fillingDone')}
                    >
                      {lead.fillingDone ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">Batch Gov. Receipt</span>
                    <span>
                      {lead.batchGovReceipt ? (
                        <a href={lead.batchGovReceipt} className="text-blue-600 underline text-xs" target="_blank" rel="noopener noreferrer">View</a>
                      ) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button aria-label="Update" className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md" onClick={() => handleOpenUploadModal(lead)}>
                      <PencilIcon /> Update
                    </button>
                    <button aria-label="Document Upload" className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-sm hover:shadow-md">
                      <UploadIcon /> Document Upload
                    </button>
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

export default AdvocateLeads; 