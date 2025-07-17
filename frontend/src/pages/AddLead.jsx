import React, { useState } from 'react';
import Header from '../components/Header';
import axios from 'axios';

const AddLead = ({ sidebarCollapsed }) => {
  const currentUser = JSON.parse(localStorage.getItem('user'));
  const [mobileNumber, setMobileNumber] = useState('');
  const [brandName, setBrandName] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!currentUser || (currentUser.role === 'employee' && !currentUser.access?.leadAdd)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700">You do not have permission to add leads.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://tc-crm.vercel.app/api/leads/led', {
        mobileNumbers: [mobileNumber],
        brandName,
        additionalNotes
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setSuccess(true);
      setMobileNumber('');
      setBrandName('');
      setAdditionalNotes('');
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header sidebarCollapsed={sidebarCollapsed} />
      <div className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-48'} mt-12`}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-2">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <h1 className="text-xl font-bold text-gray-800 mb-2">Add New Lead</h1>
              <p className="text-sm text-gray-500 mb-6">Fill in the details to add a new lead</p>
              {success && (
                <div className="text-green-700 text-base font-medium mb-4 text-center">Lead added successfully!</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={additionalNotes}
                    onChange={e => setAdditionalNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition min-h-[60px] text-base"
                  />
                </div>
                {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-all duration-200 text-base disabled:opacity-50"
                  disabled={submitting}
                >{submitting ? 'Adding...' : 'Add Lead'}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLead; 