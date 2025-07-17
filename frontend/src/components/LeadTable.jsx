import React, { useState } from 'react';
import dayjs from 'dayjs';

const LeadTable = ({ leads, onEdit, onDocumentUpload, loading, onRowDoubleClick, hideEditButton, extraColumn, canCopyId = true, selectedLeads, handleLeadCheckbox, handleSelectAll, hasCopyAccess = true }) => {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalLead, setStatusModalLead] = useState(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading leads...</div>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Leads Found</h3>
          <p className="text-gray-500">Get started by adding your first lead</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto">
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200 text-[10px]">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
            <tr>
              {selectedLeads && handleSelectAll && (
                <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    checked={selectedLeads.length === leads.length && leads.length > 0} 
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">ID</th>
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">📱 Phone</th>
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap max-w-[80px]">🏷️ Brand Name</th>
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Prospect Status</th>
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Date & Time</th>
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap max-w-[80px] truncate overflow-hidden" title="Notes">📝 Notes</th>
              <th className="px-1 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Status</th>
              <th className="px-1 py-1 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {leads.map((lead, idx) => (
              <tr
                key={lead._id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50 transition-all'}
                onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(lead)}
                style={{ cursor: 'pointer' }}
              >
                {selectedLeads && handleLeadCheckbox && (
                  <td className="px-1 py-1 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedLeads.includes(lead._id)} 
                      onChange={() => handleLeadCheckbox(lead._id)}
                    />
                  </td>
                )}
                <td className="px-1 py-1 whitespace-nowrap font-mono text-gray-500 text-[10px] flex items-center gap-1" title={lead._id}>
                  {/* Always show the ID, never 'No Copy Access' */}
                  {lead._id ? `${lead._id.slice(0, 6)}...` : 'N/A'}
                  {lead._id && (
                    <button
                      className="ml-1 text-gray-400 hover:text-blue-600 focus:outline-none"
                      title={hasCopyAccess ? 'Copy ID' : 'No Copy Access'}
                      onClick={e => {
                        e.stopPropagation();
                        if (hasCopyAccess) {
                          navigator.clipboard.writeText(lead._id);
                          if (typeof window !== 'undefined') {
                            window.__leadTableCopiedId = lead._id;
                            setTimeout(() => { window.__leadTableCopiedId = null; }, 1200);
                          }
                        }
                      }}
                      disabled={!hasCopyAccess}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                  )}
                  {typeof window !== 'undefined' && window.__leadTableCopiedId === lead._id && <span className="text-green-600 text-[10px] ml-1">Copied!</span>}
                </td>
                <td className="px-1 py-1 whitespace-nowrap font-mono text-blue-900 font-semibold sticky left-0 bg-white z-10 text-[10px]">{lead.cityCode && lead.number ? `${lead.cityCode} ${lead.number}` : lead.number || ''}</td>
                <td className="px-1 py-1 whitespace-nowrap max-w-[80px] truncate">{lead.brandName}</td>
                <td className="px-1 py-1 whitespace-nowrap">{lead.prospectStatus || 'N/A'}</td>
                <td className="px-1 py-1 whitespace-nowrap">{lead.createdAt ? dayjs(lead.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'}</td>
                <td className="px-1 py-1 whitespace-nowrap max-w-[80px] truncate overflow-hidden" title={lead.additionalNotes || lead.notes || 'No notes'}>{lead.additionalNotes || lead.notes || <span className="italic text-gray-400">No notes</span>}</td>
                <td className="px-1 py-1 whitespace-nowrap">
                  <button className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-[10px]" onClick={e => { e.stopPropagation(); setStatusModalLead(lead); setShowStatusModal(true); }}>View Status</button>
                </td>
                <td className="px-1 py-1 whitespace-nowrap">
                  <div className="flex space-x-1">
                    {!hideEditButton && (
                      <button
                        onClick={() => onEdit(lead)}
                        title="Edit Lead"
                        className="inline-flex items-center px-2 py-1 border border-transparent text-[10px] font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => onDocumentUpload && onDocumentUpload(lead)}
                      title="Upload/View Documents"
                      className="inline-flex items-center px-2 py-1 border border-transparent text-[10px] font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Documents
                    </button>
                    {extraColumn && extraColumn({ lead })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showStatusModal && statusModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs mx-auto">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Lead Status</h2>
            <div className="mb-2 flex justify-between"><span>Pending for E-Sign:</span><span className={statusModalLead.pendingForESign ? 'text-green-600 font-bold' : 'text-gray-400'}>{statusModalLead.pendingForESign ? 'Yes' : 'No'}</span></div>
            <div className="mb-2 flex justify-between"><span>Govt Payment Done:</span><span className={statusModalLead.govtPaymentDone ? 'text-green-600 font-bold' : 'text-gray-400'}>{statusModalLead.govtPaymentDone ? 'Yes' : 'No'}</span></div>
            <div className="mb-4 flex justify-between"><span>Filling Done:</span><span className={statusModalLead.fillingDone ? 'text-green-600 font-bold' : 'text-gray-400'}>{statusModalLead.fillingDone ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-end">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadTable;
  