import React from 'react';

const LeadTable = ({ leads, onEdit, onDocumentUpload, loading, onRowDoubleClick, hideEditButton, extraColumn }) => {
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
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Lead ID</th>
              <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap sticky left-0 bg-gradient-to-r from-gray-100 to-gray-200">📱 Phone</th>
              <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">🏷️ Brand Name</th>
              <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">📝 Notes</th>
              <th className="px-6 py-4 text-left font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">Actions</th>
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
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100 font-mono text-indigo-700 font-semibold">
                  {lead._id || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100 font-mono text-blue-900 font-semibold sticky left-0 bg-white z-10">
                  {lead.cityCode && lead.number
                    ? `${lead.cityCode} ${lead.number}`
                    : lead.number || ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100 font-semibold text-gray-900">
                  {lead.brandName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100 text-gray-700">
                  {lead.additionalNotes || lead.notes || <span className="italic text-gray-400">No notes</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap border-b border-gray-100">
                  <div className="flex space-x-2">
                    {!hideEditButton && (
                      <button
                        onClick={() => onEdit(lead)}
                        title="Edit Lead"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => onDocumentUpload && onDocumentUpload(lead)}
                      title="Upload/View Documents"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
};

export default LeadTable;
  