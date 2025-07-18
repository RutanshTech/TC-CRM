import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import axios from 'axios';
import Select from 'react-select';

const PROSPECT_STATUS = [
  "CNP",
  "Not Interested",
  "Switched Off",
  "Out Of Service",
  "Call Cut",
  "Follow Up",
  "After Some time",
  "Call you Back",
  "Documents Received",
];
const LEAD_STATUS = [
  "Sent for Drafting",
  "Drafting/ POA/ UA Received",
  "Filing Done",
];
const OPERATION_STATUS = ["Automatic"];
const SERVICES = [
  "Trademark",
  "ISO",
  "Copy Right",
  "Fssai",
  "Design",
  "Patent",
  "Company Registration",
  "Opposition or Notice Reply",
  "Other",
];
const FIRM_TYPES = [
  "Proprietor",
  "Partnership/ LLP",
  "Pvt. Ltd./ Public Limited/ NGO",
];
const CLASS_OPTIONS = Array.from({ length: 45 }, (_, i) => (i + 1).toString());

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

const LeadModal = ({ isOpen, onClose, onSave, lead, user, onActionComplete }) => {
  const isEditMode = !!lead;
  const [leadState, setLeadState] = useState({
    additionalNotes: '',
    payments: [{
      id: Date.now(),
      govtFees: '',
      advocateFees: '',
      userStamp: '',
      otherFees: ''
    }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [serviceToAdd, setServiceToAdd] = useState('');
  const [servicesSections, setServicesSections] = useState([Date.now()]); // Default one section

  useEffect(() => {
    if (lead) {
      // For edit mode, initialize servicesSections and per-section fields
      const services = lead.services || [];
      const classes = lead.classes || [];
      const sectionIds = services.map((_, idx) => idx);
      const newLeadState = {
        name: lead.name || "",
        email: lead.email || "",
        city: lead.city || "",
        firmType: lead.firmType || "",
        followUpStatus: lead.followUpStatus || "",
        additionalNotes: lead.additionalNotes || "",
        prospectStatus: lead.prospectStatus || "",
        leadStatus: lead.leadStatus || "",
        operationStatus: lead.operationStatus || "",
        nextFollowUpDate: lead.nextFollowUpDate || "",
        descriptionPerClass: lead.descriptionPerClass || "",
        services: services,
        classes: classes,
        mobileNumbers: lead.mobileNumbers || [""],
        brandName: lead.brandName || "",
        payments: (lead.payments && lead.payments.length > 0) ? lead.payments.map((payment, index) => ({
          ...payment,
          id: payment.id || Date.now() + index + Math.random(),
          govtFees: payment.govtFees || '',
          advocateFees: payment.advocateFees || '',
          userStamp: payment.userStamp || '',
          otherFees: payment.otherFees || ''
        })) : [{
          id: Date.now(),
          govtFees: '',
          advocateFees: '',
          userStamp: '',
          otherFees: ''
        }],
      };
      // Map per-section fields
      services.forEach((service, idx) => {
        newLeadState[`service-${idx}`] = service;
        if (service === 'Trademark') {
          newLeadState[`classes-${idx}`] = Array.isArray(classes) ? classes : [];
        }
        // Map fillingTextArray to fillingText-0, fillingText-1, etc.
        if (Array.isArray(lead.fillingTextArray) && lead.fillingTextArray[idx]) {
          newLeadState[`fillingText-${idx}`] = lead.fillingTextArray[idx];
        }
      });
      setLeadState(newLeadState);
      setServicesSections(sectionIds.length > 0 ? sectionIds : [0]);
    } else {
      setLeadState({
        name: "",
        email: "",
        city: "",
        firmType: "",
        followUpStatus: "",
        additionalNotes: "",
        prospectStatus: "",
        leadStatus: "",
        operationStatus: "",
        nextFollowUpDate: "",
        descriptionPerClass: "",
        services: [],
        classes: [],
        mobileNumbers: [""],
        brandName: "",
        payments: [{
          id: Date.now(),
          govtFees: '',
          advocateFees: '',
          userStamp: '',
          otherFees: ''
        }],
      });
      setServicesSections([0]);
    }
  }, [lead, isOpen]);

  // Debug: Log brandName on every leadState change
  useEffect(() => {
    console.log('DEBUG brandName state:', leadState.brandName);
  }, [leadState.brandName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('DEBUG handleChange:', name, value); // Debug log
    setLeadState({ ...leadState, [name]: value });
  };

  const handleMobileChange = (idx, value) => {
    const updated = [...leadState.mobileNumbers];
    updated[idx] = value;
    setLeadState({ ...leadState, mobileNumbers: updated });
  };
  const addMobile = () => {
    setLeadState({
      ...leadState,
      mobileNumbers: [...leadState.mobileNumbers, ""],
    });
  };
  
  const addServicesSection = () => {
    const newSectionId = Date.now();
    setServicesSections([...servicesSections, newSectionId]);
  };
  
  const removeServicesSection = (sectionId) => {
    setServicesSections(servicesSections.filter(id => id !== sectionId));
  };
  const removeMobile = (idx) => {
    const updated = leadState.mobileNumbers.filter((_, i) => i !== idx);
    setLeadState({ ...leadState, mobileNumbers: updated });
  };

  // Payment management functions
  const addPayment = () => {
    const newPayment = {
      id: Date.now() + Math.random(),
      govtFees: '',
      advocateFees: '',
      userStamp: '',
      otherFees: ''
    };
    setLeadState({
      ...leadState,
      payments: [...(leadState.payments || []), newPayment]
    });
  };

  const removePayment = (paymentId) => {
    const updatedPayments = (leadState.payments || []).filter(payment => payment.id !== paymentId);
    
    // Ensure at least one payment always remains
    if (updatedPayments.length === 0) {
      updatedPayments.push({
        id: Date.now() + Math.random(),
        govtFees: '',
        advocateFees: '',
        userStamp: '',
        otherFees: ''
      });
    }
    
    setLeadState({
      ...leadState,
      payments: updatedPayments
    });
  };

  const updatePayment = (paymentId, field, value) => {
    const updatedPayments = (leadState.payments || []).map(payment => 
      payment.id === paymentId ? { ...payment, [field]: value } : payment
    );
    setLeadState({
      ...leadState,
      payments: updatedPayments
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Collect all services and classes from dynamic sections
      const allServices = [];
      const allClasses = [];
      
      servicesSections.forEach(sectionId => {
        const service = leadState[`service-${sectionId}`];
        const classes = leadState[`classes-${sectionId}`] || [];
        
        if (service) {
          allServices.push(service);
          if (service === 'Trademark' && classes.length > 0) {
            allClasses.push(...classes);
          }
        }
      });
      
      const finalLeadState = {
        ...leadState,
        services: allServices,
        classes: allClasses,
        brandName: leadState.brandName, // ensure brandName is always present
        fillingTextArray: servicesSections.map((_, idx) => leadState[`fillingText-${idx}`] || '')
      };
      console.log('DEBUG FINAL LEAD STATE:', finalLeadState);
      
      if (isEditMode && lead && lead._id) {
        if (onSave) {
          await onSave({ ...finalLeadState, _id: lead._id });
        } else {
          // Fallback: handle API call here for all roles
          const token = localStorage.getItem('token');
          const user = JSON.parse(localStorage.getItem('user'));
          let url;
          if (user && user.role === 'operation') {
            url = `https://tc-crm.vercel.app/api/leads/${lead._id}/operation`;
          } else if (user && user.role === 'employee') {
            url = `https://tc-crm.vercel.app/api/leads/${lead._id}/employee`;
          } else {
            url = `https://tc-crm.vercel.app/api/leads/${lead._id}`;
          }
          await axios.put(url, { ...finalLeadState, _id: lead._id }, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Lead updated successfully!');
        }
      } else {
        if (onSave) {
          await onSave({ ...finalLeadState });
        } else {
          // Fallback: handle API call here for all roles
          const token = localStorage.getItem('token');
          await axios.post('https://tc-crm.vercel.app/api/leads/led', finalLeadState, {
            headers: { Authorization: `Bearer ${token}` },
          });
          toast.success('Lead created successfully!');
        }
      }
      if (typeof onActionComplete === 'function') {
        onActionComplete();
      }
      setLeadState(isEditMode ? {
        name: '',
        prospectStatus: '',
        leadStatus: '',
        operationStatus: '',
        email: '',
        city: '',
        services: [],
        classes: [],
        descriptionPerClass: '',
        firmType: '',
        followUpStatus: '',
        nextFollowUpDate: '',
        additionalNotes: '',
        manualFields: [''],
        paymentClaim: {
          govtFees: '',
          advocateFees: '',
          userStamp: '',
          otherFees: '',
        },
        payments: [{
          id: Date.now(),
          govtFees: '',
          advocateFees: '',
          userStamp: '',
          otherFees: ''
        }]
      } : {
        additionalNotes: '',
        payments: [{
          id: Date.now(),
          govtFees: '',
          advocateFees: '',
          userStamp: '',
          otherFees: ''
        }]
      });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save lead');
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback for paymentClaim to prevent undefined errors
  const safePaymentClaim = leadState.paymentClaim || { govtFees: '', advocateFees: '', userStamp: '', otherFees: '' };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="relative w-full mx-2 rounded-2xl shadow-2xl bg-white overflow-y-auto max-h-[90vh] hide-scrollbar" style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {lead ? 'Upload Lead Details' : 'Add New Lead'}
          </h2>
          <button onClick={onClose} className="text-white hover:text-red-200 text-3xl font-bold transition-colors hover:scale-110 transform duration-200">&times;</button>
        </div>
        <form className="px-6 py-6">
          {/* Add Mode: Only show phone, brand name, notes */}
          {!isEditMode && (
            <>
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Numbers <span className="text-red-500">*</span></label>
                {leadState.mobileNumbers.map((num, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-1">
                    <PhoneInput country={"in"} value={num} onChange={(val) => handleMobileChange(idx, val)} inputClass="!w-full !rounded-lg" />
                    {leadState.mobileNumbers.length > 1 && (
                      <button type="button" onClick={() => removeMobile(idx)} className="text-red-500 hover:text-red-700 text-lg transition-colors">&times;</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addMobile} className="text-blue-600 text-xs mt-1 hover:underline">+ Add another</button>
              </div>
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Brand Name</label>
                <input type="text" name="brandName" value={leadState.brandName || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea name="additionalNotes" value={leadState.additionalNotes || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition min-h-[60px]" />
              </div>
            </>
          )}
          {/* Edit Mode: Modern, visually grouped design, compact and clean */}
          {isEditMode && (
            <div className="space-y-8">
              {/* Lead Info Section */}
              <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><span className="inline-block">📋</span> Lead Info</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={leadState.mobileNumbers && leadState.mobileNumbers[0] ? leadState.mobileNumbers[0] : ''}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  {/* Operation Status */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Operation Status</label>
                    <select name="operationStatus" value="Automatic" disabled className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 shadow-sm focus:outline-none">
                      <option value="Automatic">Automatic</option>
                    </select>
                  </div>
                  {/* Brand Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Brand Name</label>
                    <input
                      type="text"
                      name="brandName"
                      value={leadState.brandName || ''}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition"
                    />
                  </div>
                  {/* The rest of the fields (Name, City, Firm Type, Email, Prospect Status, etc.) go here, in their previous order, but after the above three fields. */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                    <input type="text" name="name" value={leadState.name || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
                    <input type="text" name="city" value={leadState.city || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Firm Type</label>
                    <select name="firmType" value={leadState.firmType || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition">
                      <option value="">Select Firm Type</option>
                      {FIRM_TYPES.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" name="email" value={leadState.email || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Prospect Status</label>
                    <select name="prospectStatus" value={leadState.prospectStatus || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition">
                      <option value="">Select Status</option>
                      {PROSPECT_STATUS.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Follow Up Status</label>
                    <input type="text" name="followUpStatus" value={leadState.followUpStatus || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Next Follow Up Date</label>
                    <input type="date" name="nextFollowUpDate" value={leadState.nextFollowUpDate ? leadState.nextFollowUpDate.slice(0, 10) : ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition" />
                  </div>
                </div>
              </div>
              {/* Services & Class Sections */}
              {servicesSections.map((sectionId, index) => (
                <div key={sectionId} className="relative bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow border border-blue-200 mb-8 transition-all duration-300">
                  {/* Header Bar */}
                  <div className="flex items-center justify-between px-6 py-3 rounded-t-2xl bg-gradient-to-r from-blue-100 to-blue-200 border-b border-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="inline-block text-blue-600 text-xl">🛠️</span>
                      <span className="font-bold text-blue-900 text-lg">Services & Class #{index + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeServicesSection(sectionId)}
                      className="text-red-500 hover:text-white hover:bg-red-500 transition-all duration-200 rounded-full w-8 h-8 flex items-center justify-center text-xl font-bold border border-red-200 bg-red-50 hover:scale-110"
                      title="Remove Section"
                    >
                      ×
                    </button>
                  </div>
                  {/* Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-6">
                    {/* Service */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Service</label>
                      <select
                        value={leadState[`service-${sectionId}`] || ''}
                        onChange={e => setLeadState({ ...leadState, [`service-${sectionId}`]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 transition"
                      >
                        <option value="" disabled>Select Service</option>
                        {SERVICES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    {/* Class (multi-select) - Only show if service is Trademark */}
                    {leadState[`service-${sectionId}`] === 'Trademark' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Class</label>
                        <Select
                          isMulti
                          options={CLASS_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                          value={(leadState[`classes-${sectionId}`] || []).map(val => ({ value: val, label: val }))}
                          onChange={selected => setLeadState({ ...leadState, [`classes-${sectionId}`]: selected.map(opt => opt.value) })}
                          classNamePrefix="react-select"
                          className="react-select-container"
                          placeholder="Select Class(es)"
                        />
                      </div>
                    )}
                    {/* Description Per Class */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Description Per Class</label>
                      <textarea
                        value={leadState[`descriptionPerClass-${sectionId}`] || ''}
                        onChange={e => setLeadState({ ...leadState, [`descriptionPerClass-${sectionId}`]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 transition min-h-[40px]"
                        placeholder="Description for this service/class"
                      />
                    </div>
                    {/* Services Status */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Services Status</label>
                      <select
                        value={leadState[`servicesStatus-${sectionId}`] || ''}
                        onChange={e => setLeadState({ ...leadState, [`servicesStatus-${sectionId}`]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 transition"
                      >
                        <option value="" disabled>Select Status</option>
                        <option value="Sent for Drafting">Sent for Drafting</option>
                        <option value="Drafting/ POA/ UA Received">Drafting/ POA/ UA Received</option>
                        <option value="Filing Done">Filing Done</option>
                      </select>
                    </div>
                    {/* Follow Up Status */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Follow Up Status</label>
                      <input
                        type="text"
                        value={leadState[`followUpStatus-${sectionId}`] || ''}
                        onChange={e => setLeadState({ ...leadState, [`followUpStatus-${sectionId}`]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 transition"
                      />
                    </div>
                    {/* Next Follow Up Date */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Next Follow Up Date</label>
                      <input
                        type="date"
                        value={leadState[`nextFollowUpDate-${sectionId}`] ? leadState[`nextFollowUpDate-${sectionId}`].slice(0, 10) : ""}
                        onChange={e => setLeadState({ ...leadState, [`nextFollowUpDate-${sectionId}`]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 transition"
                      />
                    </div>
                  </div>
                  {/* Filling Details for Operation Users */}
                  {isEditMode
                    ? (user && user.role === 'operation' && (
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-semibold text-blue-700 mb-1">Filling Details</label>
                          <textarea
                            name={`fillingText-${index}`}
                            value={leadState[`fillingText-${index}`] || ''}
                            onChange={e => setLeadState({ ...leadState, [`fillingText-${index}`]: e.target.value })}
                            className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-300 transition min-h-[40px]"
                            placeholder="Enter filling details..."
                          />
                        </div>
                      ))
                    : (lead && Array.isArray(lead.fillingTextArray) && lead.fillingTextArray[index] && (
                        <div className="col-span-1 md:col-span-2">
                          <label className="block text-sm font-semibold text-blue-700 mb-1">Filling Details</label>
                          <div className="w-full border border-blue-300 rounded-lg px-4 py-2 bg-gray-50 shadow-sm min-h-[40px] text-gray-800">
                            {lead.fillingTextArray[index]}
                          </div>
                        </div>
                      ))
                  }
                  {/* Divider for multiple sections */}
                  {index < servicesSections.length - 1 && (
                    <div className="absolute left-6 right-6 bottom-0 h-0.5 bg-gradient-to-r from-blue-100 to-blue-200 opacity-60 rounded-full" />
                  )}
                </div>
              ))}
              
              {/* Add Services Button */}
              <div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300 p-6 text-center cursor-pointer hover:from-blue-100 hover:to-indigo-100 hover:border-blue-400 transition-all duration-200 group"
                onClick={addServicesSection}
              >
                <div className="text-blue-600 group-hover:text-blue-800 text-sm font-medium flex items-center justify-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                    <span className="text-blue-600 text-lg font-bold">+</span>
                  </div>
                  Add Services & Class
                </div>
              </div>
              {/* Notes & Payment Claim Section */}
              <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><span className="inline-block">💸</span> Notes & Payment Claim</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea name="additionalNotes" value={leadState.additionalNotes || ""} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition min-h-[60px]" />
                </div>
                
                {/* Dynamic Payment Section */}
                <div>
                  <div className="mb-4">
                    <h4 className="text-base font-bold text-blue-700">Payments</h4>
                  </div>
                  
                  {/* Payment Entries */}
                  {(leadState.payments || []).map((payment, index) => (
                    <div key={payment.id} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-gray-700">Payment #{index + 1}</h5>
                        {(leadState.payments || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePayment(payment.id)}
                            className="text-red-500 hover:text-red-700 text-lg font-bold transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1">Govt Fees</label>
                          <input
                            type="number"
                            value={payment.govtFees}
                            onChange={(e) => updatePayment(payment.id, 'govtFees', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1">Advocate Fees</label>
                          <input
                            type="number"
                            value={payment.advocateFees}
                            onChange={(e) => updatePayment(payment.id, 'advocateFees', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1">User Stamp</label>
                          <input
                            type="number"
                            value={payment.userStamp}
                            onChange={(e) => updatePayment(payment.id, 'userStamp', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-1">Other Fees</label>
                          <input
                            type="number"
                            value={payment.otherFees}
                            onChange={(e) => updatePayment(payment.id, 'otherFees', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      {/* Payment Total */}
                      <div className="mt-3 text-right">
                        <span className="text-sm font-semibold text-blue-700">
                          Total: ₹{(
                            Number(payment.govtFees || 0) +
                            Number(payment.advocateFees || 0) +
                            Number(payment.userStamp || 0) +
                            Number(payment.otherFees || 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Grand Total and Add Payment Button */}
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="text-lg font-bold text-blue-800">
                        Grand Total: ₹{(
                          (leadState.payments || []).reduce((total, payment) => 
                            total + 
                            Number(payment.govtFees || 0) +
                            Number(payment.advocateFees || 0) +
                            Number(payment.userStamp || 0) +
                            Number(payment.otherFees || 0), 0
                          )
                        ).toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addPayment}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <span className="text-lg">+</span> Add Payment
                    </button>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="sticky bottom-0 z-10 bg-white border-t py-4 flex flex-col gap-3 mt-4">
                <button onClick={onClose} type="button" className="w-full px-4 py-3 rounded-xl font-semibold shadow-sm border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2" disabled={submitting}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button onClick={handleSubmit} type="button" className="w-full px-4 py-3 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-[1.02]" disabled={submitting}>
                  {submitting && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  )}
                  {!submitting && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  {submitting ? (lead ? 'Uploading Details...' : 'Saving...') : lead ? 'Upload Details' : 'Add Lead'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
