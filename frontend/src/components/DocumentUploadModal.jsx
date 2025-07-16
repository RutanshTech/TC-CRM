import React, { useState } from 'react';
import { toast } from 'react-toastify';

const initialFiles = {
  aadharCardFront: null,
  aadharCardBack: null,
  panCard: null,
  passportPhoto: null,
  companyPan: null,
  incorporationCertificate: null,
  msme: null,
  partnershipDeed: null,
  logo: null,
  additionalFiles: [],
};

const DocumentUploadModal = ({ isOpen, onClose, lead, onUploadSuccess, batchGovReceiptMode }) => {
  const [files, setFiles] = useState(initialFiles);
  const [batchGovReceiptFile, setBatchGovReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (field, file) => {
    setFiles({ ...files, [field]: file });
  };

  const handleAdditionalFileChange = (file) => {
    if (file) {
      setFiles({ ...files, additionalFiles: [...files.additionalFiles, file] });
    }
  };

  const removeAdditionalFile = (index) => {
    const updatedFiles = files.additionalFiles.filter((_, i) => i !== index);
    setFiles({ ...files, additionalFiles: updatedFiles });
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      if (!lead || !lead._id) {
        toast.error('Lead information is missing');
        return;
      }
      const formData = new FormData();
      if (batchGovReceiptMode) {
        if (!batchGovReceiptFile) {
          toast.error('Please select a Batch Gov. Receipt file');
          setUploading(false);
          return;
        }
        formData.append('batchGovReceiptFile', batchGovReceiptFile);
      } else {
        Object.keys(files).forEach(field => {
          if (field === 'additionalFiles') {
            files[field].forEach((file) => {
              if (file) {
                formData.append('additionalFiles', file);
              }
            });
          } else {
            if (files[field]) {
              formData.append(field, files[field]);
            }
          }
        });
      }
      const token = localStorage.getItem('token');
      const response = await fetch(`https://tc-crm.vercel.app/api/leads/${lead._id}/upload`, {
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
    setFiles(initialFiles);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative w-full mx-2 rounded-2xl shadow-2xl bg-white overflow-y-auto max-h-[90vh] hide-scrollbar" style={{ maxWidth: '900px' }}>
        <div className="sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-700 rounded-t-2xl border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">Document Upload</h2>
          <button onClick={handleClose} className="text-white hover:text-red-200 text-3xl font-bold transition-colors hover:scale-110 transform duration-200">&times;</button>
        </div>
        <div className="px-6 py-6">
          {lead && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2">Lead Info:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-gray-700">Phone Number:</span>
                  <input
                    type="text"
                    value={lead.cityCode && lead.number ? `${lead.cityCode} ${lead.number}` : lead.number || 'N/A'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                    readOnly
                  />
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Brand Name:</span>
                  <input
                    type="text"
                    value={lead.brandName || ''}
                    onChange={e => lead.brandName = e.target.value}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
          )}
          {/* Services & Class section with Services Status */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Services & Class</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Services Status:</span>
                <select
                  value={lead.servicesStatus || ''}
                  onChange={e => lead.servicesStatus = e.target.value}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="" disabled>Select Status</option>
                  <option value="Sent for Drafting">Sent for Drafting</option>
                  <option value="Drafting/ POA/ UA Received">Drafting/ POA/ UA Received</option>
                  <option value="Filing Done">Filing Done</option>
                </select>
              </div>
              {/* Add more fields for Services/Class if needed */}
            </div>
          </div>
          {batchGovReceiptMode ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="inline-block">📄</span> Batch Gov. Receipt
              </h3>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setBatchGovReceiptFile(e.target.files[0])}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
              />
              {batchGovReceiptFile && (
                <p className="text-xs text-yellow-600 mt-1">✓ {batchGovReceiptFile.name}</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-block">🆔</span> Identity Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Aadhar Card Front</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('aadharCardFront', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.aadharCardFront && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.aadharCardFront.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Aadhar Card Back</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('aadharCardBack', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.aadharCardBack && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.aadharCardBack.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">PAN Card</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('panCard', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.panCard && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.panCard.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passport Photo</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('passportPhoto', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.passportPhoto && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.passportPhoto.name}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-block">🏢</span> Business Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company PAN</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('companyPan', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.companyPan && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.companyPan.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Incorporation Certificate</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('incorporationCertificate', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.incorporationCertificate && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.incorporationCertificate.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">MSME Certificate</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('msme', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.msme && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.msme.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Partnership Deed</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('partnershipDeed', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.partnershipDeed && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.partnershipDeed.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.svg"
                      onChange={(e) => handleFileChange('logo', e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    {files.logo && (
                      <p className="text-xs text-green-600 mt-1">✓ {files.logo.name}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="inline-block">📎</span> Additional Documents
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Add More Documents</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleAdditionalFileChange(e.target.files[0])}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  {files.additionalFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">Uploaded Files:</h4>
                      {files.additionalFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-700">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalFile(index)}
                            className="text-red-500 hover:text-red-700 text-lg font-bold transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="sticky bottom-0 z-10 bg-white border-t py-4 flex flex-col gap-3 mt-6">
            <button onClick={handleClose} type="button" className="w-full px-4 py-3 rounded-xl font-semibold shadow-sm border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2" disabled={uploading}>Cancel</button>
            <button onClick={handleSubmit} type="button" className="w-full px-4 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-[1.02]" disabled={uploading}>{uploading ? (batchGovReceiptMode ? 'Uploading Batch Gov. Receipt...' : 'Uploading Documents...') : (batchGovReceiptMode ? 'Upload Batch Gov. Receipt' : 'Upload Documents')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal; 