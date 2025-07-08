import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AllLeads = ({ sidebarCollapsed }) => {
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
              <h1 className="text-2xl font-bold text-gray-800">All Leads</h1>
              <p className="text-sm text-gray-600 mt-1">All leads overview</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto w-full">
            <table className="min-w-full w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Mobile Number(s)</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Brand Name</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Follow Up Status</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Additional Notes</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Pending for E-Sign</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Govt Payment Done</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Filling Done</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Batch Gov. Receipt</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-gray-500">Loading leads...</td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-gray-500">No leads found.</td>
                  </tr>
                ) : (
                  leads.map((lead, idx) => (
                    <tr key={lead._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-blue-700 underline cursor-pointer">{lead.number || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{lead.brandName || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{lead.followUpStatus || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{lead.additionalNotes || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded ${lead.pendingESign ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{lead.pendingESign ? 'Yes' : 'No'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded ${lead.govtPaymentDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{lead.govtPaymentDone ? 'Yes' : 'No'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-1 rounded ${lead.fillingDone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{lead.fillingDone ? 'Yes' : 'No'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lead.batchGovReceipt ? <a href={lead.batchGovReceipt} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">View</a> : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded mr-2" onClick={() => handleOpenUploadModal(lead)}>Update</button>
                        <a href={lead.batchGovReceipt || '#'} className="text-blue-600 underline mr-2">View</a>
                        <button className="bg-green-600 text-white px-3 py-1 rounded">Document Upload</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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