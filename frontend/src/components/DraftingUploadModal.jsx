import React, { useState } from 'react';
import { toast } from 'react-toastify';

const DraftingUploadModal = ({ isOpen, onClose, lead, onUploadSuccess }) => {
  const [draftFile, setDraftFile] = useState(null);
  const [poaFile, setPoaFile] = useState(null);
  const [uaFile, setUaFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (field, file) => {
    if (field === 'draft') setDraftFile(file);
    if (field === 'poa') setPoaFile(file);
    if (field === 'ua') setUaFile(file);
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      if (!lead || !lead._id) {
        toast.error('Lead information is missing');
        return;
      }
      if (!draftFile && !poaFile && !uaFile) {
        toast.error('Please select at least one file to upload');
        return;
      }
      const formData = new FormData();
      if (draftFile) formData.append('draft', draftFile);
      if (poaFile) formData.append('poa', poaFile);
      if (uaFile) formData.append('ua', uaFile);
      const token = localStorage.getItem('token');
      const response = await fetch(`tc-crm.vercel.app/api/leads/${lead._id}/upload-drafting`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      toast.success('Documents uploaded successfully!');
      if (onUploadSuccess) onUploadSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to upload documents: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setDraftFile(null);
    setPoaFile(null);
    setUaFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative w-full mx-2 rounded-2xl shadow-2xl bg-white overflow-y-auto max-h-[90vh] hide-scrollbar" style={{ maxWidth: '400px' }}>
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">Drafting Upload</h2>
          <button onClick={handleClose} className="text-white hover:text-red-200 text-3xl font-bold transition-colors hover:scale-110 transform duration-200">&times;</button>
        </div>
        <div className="px-6 py-6">
          {lead && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Uploading for:</h3>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div><span className="font-semibold text-gray-700">Brand:</span> {lead.brandName || 'N/A'}</div>
                <div><span className="font-semibold text-gray-700">Phone:</span> {lead.cityCode && lead.number ? `${lead.cityCode} ${lead.number}` : lead.number || 'N/A'}</div>
              </div>
            </div>
          )}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Draft</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.svg"
                onChange={e => handleFileChange('draft', e.target.files[0])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition"
              />
              {draftFile && (
                <p className="text-xs text-green-600 mt-1">✓ {draftFile.name}</p>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">POA</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.svg"
                onChange={e => handleFileChange('poa', e.target.files[0])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition"
              />
              {poaFile && (
                <p className="text-xs text-green-600 mt-1">✓ {poaFile.name}</p>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">UA</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.svg"
                onChange={e => handleFileChange('ua', e.target.files[0])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition"
              />
              {uaFile && (
                <p className="text-xs text-green-600 mt-1">✓ {uaFile.name}</p>
              )}
            </div>
          </div>
          <div className="sticky bottom-0 z-10 bg-white border-t py-4 flex flex-col gap-3 mt-6">
            <button onClick={handleClose} type="button" className="w-full px-4 py-3 rounded-xl font-semibold shadow-sm border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2" disabled={uploading}>Cancel</button>
            <button onClick={handleSubmit} type="button" className="w-full px-4 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-[1.02]" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload Documents'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftingUploadModal; 