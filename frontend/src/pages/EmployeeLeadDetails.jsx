import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LeadModal from '../components/LeadModal';

const documentFields = [
  { key: 'aadharCardFront', label: 'Aadhar Card Front' },
  { key: 'aadharCardBack', label: 'Aadhar Card Back' },
  { key: 'panCard', label: 'PAN Card' },
  { key: 'passportPhoto', label: 'Passport Size Photo' },
  { key: 'companyPan', label: 'Company PAN' },
  { key: 'incorporationCertificate', label: 'Incorporation Certificate' },
  { key: 'msme', label: 'MSME' },
  { key: 'partnershipDeed', label: 'Partnership/ Pvt. Ltd/ LLP Deed' },
  { key: 'logo', label: 'Logo' },
];

const EmployeeLeadDetails = () => {
  const { leadId } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`tc-crm.vercel.app/api/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLead(res.data);
    } catch (err) {
      setError('Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!lead) return <div className="p-8">No lead found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Employee Lead Details</h1>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><b>Name:</b> {lead.name}</div>
          <div><b>Email:</b> {lead.email}</div>
          <div><b>City:</b> {lead.city}</div>
          <div><b>Brand Name:</b> {lead.brandName}</div>
          <div><b>Firm Type:</b> {lead.firmType}</div>
          <div><b>Prospect Status:</b> {lead.prospectStatus}</div>
          <div><b>Lead Status:</b> {lead.leadStatus}</div>
          <div><b>Operation Status:</b> {lead.operationStatus}</div>
          <div><b>Follow Up Status:</b> {lead.followUpStatus}</div>
          <div><b>Next Follow Up Date:</b> {lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0,10) : ''}</div>
        </div>
        <div className="mt-4">
          <b>Mobile Numbers:</b>
          <ul className="list-disc ml-6">
            {(lead.mobileNumbers || []).map((num, i) => <li key={i}>{num}</li>)}
          </ul>
        </div>
        <div className="mt-4">
          <b>Services:</b> {(lead.services || []).join(', ')}
        </div>
        <div className="mt-2">
          <b>Class(es):</b> {(lead.classes || []).join(', ')}
        </div>
        <div className="mt-2">
          <b>Description Per Class:</b> {lead.descriptionPerClass}
        </div>
        <div className="mt-2">
          <b>Manual Fields:</b> {(lead.manualFields || []).filter(Boolean).join(', ')}
        </div>
        <div className="mt-2">
          <b>Additional Notes:</b> {lead.additionalNotes}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentFields.map(field => lead[field.key] ? (
            <div key={field.key}>
              <b>{field.label}:</b> <a href={lead[field.key].url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{lead[field.key].name}</a>
            </div>
          ) : null)}
          {(lead.additionalFiles && lead.additionalFiles.length > 0) && (
            <div className="md:col-span-2">
              <b>Additional Files:</b>
              <ul className="list-disc ml-6">
                {lead.additionalFiles.map((file, i) => (
                  <li key={i}><a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{file.name}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Payment Claim</h2>
        {lead.paymentClaim ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><b>Govt Fees:</b> {lead.paymentClaim.govtFees}</div>
            <div><b>Advocate Fees:</b> {lead.paymentClaim.advocateFees}</div>
            <div><b>User + Stamp:</b> {lead.paymentClaim.userStamp}</div>
            <div><b>Other Fees:</b> {lead.paymentClaim.otherFees}</div>
          </div>
        ) : <div>No payment claim info.</div>}
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Chat</h2>
        {lead.chat && lead.chat.length > 0 ? (
          <ul className="list-disc ml-6">
            {lead.chat.map((msg, i) => (
              <li key={i}><b>{msg.sender?.name || 'User'}:</b> {msg.message} <span className="text-xs text-gray-400">({msg.sentAt ? msg.sentAt.slice(0, 19).replace('T', ' ') : ''})</span></li>
            ))}
          </ul>
        ) : <div>No chat messages.</div>}
      </div>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Log</h2>
        {lead.log && lead.log.length > 0 ? (
          <ul className="list-disc ml-6">
            {lead.log.map((entry, i) => (
              <li key={i}><b>{entry.action}</b> by {entry.user?.name || 'User'} <span className="text-xs text-gray-400">({entry.timestamp ? entry.timestamp.slice(0, 19).replace('T', ' ') : ''})</span></li>
            ))}
          </ul>
        ) : <div>No log entries.</div>}
      </div>
      <button
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => setIsModalOpen(true)}
      >
        Edit/Claim Lead
      </button>
      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => setIsModalOpen(false)}
        lead={lead}
        onActionComplete={fetchLead}
      />
    </div>
  );
};

export default EmployeeLeadDetails; 