import React, { useEffect, useState } from 'react';
import Header from '../components/Header';

const YourSheet = ({ sidebarCollapsed }) => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  const employeeId = user?.employeeId;

  useEffect(() => {
    if (!employeeId) return;
    fetch(`/api/leads/sheet-assigned?employeeId=${employeeId}`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setSheets(data.assignedSheets || []);
        setLoading(false);
      });
  }, [employeeId]);

  // Sidebar width: 176px (open), 48px (collapsed)
  const sidebarWidth = sidebarCollapsed ? 48 : 176;

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('en-GB');
  };
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return d.toLocaleString('en-GB');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div
        className="pt-20 px-4 md:px-8 max-w-6xl mx-auto transition-all duration-300"
        style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.3s' }}
      >
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-blue-700">Your Assigned Sheets</h1>
          </div>
          {loading ? (
            <div className="text-center text-blue-500 text-lg py-8">Loading...</div>
          ) : sheets.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-8">No sheets assigned to you yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">sr.</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">NAME</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">NUMBER</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">FIRM TYPE</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">CITY</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">CLASS</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">NAME FOR REG.</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">DATE</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">STATUS</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">FOLOW DATE</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">assignedAt</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sheets.map((row, idx) => {
                    const d = row.data || {};
                    return (
                      <tr key={row._id} className={idx % 2 === 0 ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 text-sm text-gray-900 font-medium">{d.SR || d.sr || formatDate(d.DATE) || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.NAME || d.name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.NUMBER || d.number || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.FIRM_TYPE || d.firmType || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.CITY || d.city || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.CLASS || d.class || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d['NAME FOR REG.'] || d.nameForReg || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatDate(d.DATE)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{d.STATUS || d.status || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatDate(d['FOLOW DATE'] || d.followDate)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatDateTime(row.assignedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourSheet; 