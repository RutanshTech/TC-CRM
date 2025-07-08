import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DraftingUploadModal from '../components/DraftingUploadModal';

const OperationsLeads = ({ sidebarCollapsed }) => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    setUser(currentUser);
    if (currentUser && currentUser.role === 'operation') {
      fetchAssignedLeads(currentUser.id);
    }
    // eslint-disable-next-line
  }, []);

  const fetchAssignedLeads = async (operationId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/leads/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allLeads = Array.isArray(res.data) ? res.data : res.data.leads || [];
      const assignedLeads = allLeads.filter(lead => {
        if (!lead.assignedToOperation) return false;
        const opId = typeof lead.assignedToOperation === 'string'
          ? lead.assignedToOperation
          : (lead.assignedToOperation.$oid || lead.assignedToOperation.toString());
        return opId === operationId;
      });
      setLeads(assignedLeads);
    } catch (error) {
      toast.error('Error loading assigned leads');
    }
    setLoading(false);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${sidebarCollapsed ? 'ml-12' : 'ml-44'} transition-all duration-300`}>
      <Header />
      <div className="p-6 pt-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎯 Operations Leads</h1>
              <p className="text-gray-600 mt-2">Leads assigned to you by Employees</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
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
                <h2 className="text-lg font-semibold text-gray-700 mb-2">No leads assigned</h2>
                <p className="text-gray-500">You don't have any leads assigned yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number(s)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Follow Up Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Additional Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drafting</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-blue-50 cursor-pointer transition-all">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {(lead.mobileNumbers || []).map((num, i) => (
                            <span key={i} className="inline-block mr-1 bg-blue-50 px-2 py-0.5 rounded text-xs text-blue-800 border border-blue-100">
                              {num}
                              {i === (lead.mobileNumbers.length - 1) && lead.mobileNumbers.length > 1 && (
                                <span className="ml-1 text-blue-500 font-bold align-middle">+</span>
                              )}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{lead.brandName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{lead.followUpStatus}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{lead.additionalNotes}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow text-xs font-semibold"
                            onClick={() => { setSelectedLead(lead); setUploadModalOpen(true); }}
                          >
                            Drafting
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <DraftingUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        lead={selectedLead}
        onUploadSuccess={() => {
          setUploadModalOpen(false);
          if (user && user.id) fetchAssignedLeads(user.id);
        }}
      />
    </div>
  );
};

export default OperationsLeads; 