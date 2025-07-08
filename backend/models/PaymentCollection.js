const mongoose = require('mongoose');

const paymentCollectionSchema = new mongoose.Schema({
  // Payment Details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  paymentMethod: { type: String, required: true }, // cash, bank transfer, UPI, etc.
  
  // Lead Information
  leadId: { type: String },
  leadPhoneNumber: { type: String },
  leadCompanyName: String,
  leadNotes: String,
  
  // Employee Information
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeId: String,
  employeeName: String,
  
  // Payment Status
  status: { 
    type: String, 
    enum: ['pending', 'claimed', 'verified', 'rejected'], 
    default: 'pending' 
  },
  
  // Claim Information
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  claimedAt: Date,
  claimReason: String,
  
  // Verification
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  verificationNotes: String,
  
  // Notification
  notificationSent: { type: Boolean, default: false },
  notificationSentAt: Date,
  notifiedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  
  // Timestamps
  paymentDate: { type: Date, default: Date.now },
  dueDate: Date,
  
  // Additional Information
  description: String,
  receiptNumber: String,
  transactionId: String,
  accountName: { type: String },
  
  // Audit Trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Index for efficient queries
paymentCollectionSchema.index({ leadId: 1, status: 1 });
paymentCollectionSchema.index({ collectedBy: 1, status: 1 });
paymentCollectionSchema.index({ paymentDate: -1 });

// Method to claim payment
paymentCollectionSchema.methods.claimPayment = function(employeeId, reason) {
  this.claimedBy = employeeId;
  this.claimedAt = new Date();
  this.claimReason = reason;
  this.status = 'claimed';
  return this.save();
};

// Method to verify payment
paymentCollectionSchema.methods.verifyPayment = function(verifiedBy, notes) {
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;
  this.status = 'verified';
  return this.save();
};

// Method to reject payment
paymentCollectionSchema.methods.rejectPayment = function(verifiedBy, notes) {
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;
  this.status = 'rejected';
  return this.save();
};

// Method to send notification
paymentCollectionSchema.methods.sendNotification = function(employeeIds) {
  this.notificationSent = true;
  this.notificationSentAt = new Date();
  this.notifiedEmployees = employeeIds;
  return this.save();
};

module.exports = mongoose.model('PaymentCollection', paymentCollectionSchema); 