// Lead Model
const mongoose = require('mongoose');

const fileFieldSchema = {
  url: String,
  name: String,
  uploadedAt: { type: Date, default: Date.now }
};

const chatMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  sentAt: { type: Date, default: Date.now }
}, { _id: false });

const logEntrySchema = new mongoose.Schema({
  action: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  details: mongoose.Schema.Types.Mixed
}, { _id: false });

const leadSchema = new mongoose.Schema({
  name: String,
  mobileNumbers: [{ type: String }], // Multiple numbers
  prospectStatus: { type: String },
  leadStatus: { type: String },
  operationStatus: { type: String },
  email: String,
  city: String,
  services: [{ type: String }], // Multiple services
  classes: [{ type: String }], // Multiple classes (1-45)
  descriptionPerClass: String,
  brandName: String,
  firmType: String,
  followUpStatus: String,
  nextFollowUpDate: Date,
  additionalNotes: String,
  manualFields: [{ type: String }], // For dynamic/manual fields
  // File uploads
  aadharCardFront: fileFieldSchema,
  aadharCardBack: fileFieldSchema,
  panCard: fileFieldSchema,
  passportPhoto: fileFieldSchema,
  companyPan: fileFieldSchema,
  incorporationCertificate: fileFieldSchema,
  msme: fileFieldSchema,
  partnershipDeed: fileFieldSchema,
  logo: fileFieldSchema,
  additionalFiles: [fileFieldSchema],
  draftingFile: fileFieldSchema,
  draftingFiles: {
    draft: fileFieldSchema,
    poa: fileFieldSchema,
    ua: fileFieldSchema
  },
  // Log
  log: [logEntrySchema],
  // Chat
  chat: [chatMessageSchema],
  // Payment Claim
  paymentClaim: {
    govtFees: Number,
    advocateFees: Number,
    userStamp: Number,
    otherFees: Number,
    paymentCollection: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentCollection' }
  },
  // Multiple Payments
  payments: [{
    govtFees: { type: Number, default: 0 },
    advocateFees: { type: Number, default: 0 },
    userStamp: { type: Number, default: 0 },
    otherFees: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  // Previous Leads
  previousLeads: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }],
  // Assignment
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  assignedToOperation: { type: mongoose.Schema.Types.ObjectId, ref: 'Operation' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  assignedToAdvocate: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Status for pending/completed
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  // Advocate-specific fields
  pendingForESign: { type: Boolean, default: false },
  govtPaymentDone: { type: Boolean, default: false },
  fillingDone: { type: Boolean, default: false },
  batchSelectionForGovReceipt: { type: Boolean, default: false },
  batchGovReceiptFile: fileFieldSchema,
  // For compatibility with old fields
  number: { type: String },
  class: String,
  countryCode: String,
  country: String,
  date: { type: Date, default: Date.now },
  // Restrict select/copy/download (UI only)
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
