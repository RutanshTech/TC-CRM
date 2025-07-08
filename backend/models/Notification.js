const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Details
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['payment_claim', 'lead_status', 'employee_block', 'leave_approval', 'system_alert', 'productivity_alert'], 
    required: true 
  },
  
  // Priority
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  
  // Recipients
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  allEmployees: { type: Boolean, default: false },
  
  // Sender
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Status
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read', 'archived'], 
    default: 'sent' 
  },
  
  // Read Status by Recipients
  readBy: [{
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    readAt: { type: Date, default: Date.now }
  }],
  
  // Related Data
  relatedData: {
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentCollection' },
    leadId: String,
    employeeId: String,
    leaveId: String
  },
  
  // Action Required
  requiresAction: { type: Boolean, default: false },
  actionType: { 
    type: String, 
    enum: ['claim_payment', 'approve_leave', 'unblock_employee', 'review_lead'] 
  },
  actionDeadline: Date,
  
  // Delivery
  emailSent: { type: Boolean, default: false },
  smsSent: { type: Boolean, default: false },
  pushSent: { type: Boolean, default: false },
  
  // Timestamps
  scheduledAt: Date,
  sentAt: Date,
  expiresAt: Date
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ recipients: 1, status: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ requiresAction: 1, actionDeadline: 1 });

// Method to mark as read
notificationSchema.methods.markAsRead = function(employeeId) {
  const existingRead = this.readBy.find(read => read.employee.toString() === employeeId.toString());
  
  if (!existingRead) {
    this.readBy.push({
      employee: employeeId,
      readAt: new Date()
    });
    
    // Update status if all recipients have read
    if (this.readBy.length === this.recipients.length) {
      this.status = 'read';
    }
  }
  
  return this.save();
};

// Method to archive notification
notificationSchema.methods.archiveNotification = function() {
  this.status = 'archived';
  return this.save();
};

// Method to send notification
notificationSchema.methods.sendNotification = function() {
  this.sentAt = new Date();
  this.status = 'delivered';
  return this.save();
};

// Static method to create payment claim notification
notificationSchema.statics.createPaymentClaimNotification = function(paymentData, recipients) {
  return this.create({
    title: 'Payment Collection Available',
    message: `A payment of ₹${paymentData.amount} for lead ${paymentData.leadId} is available for claim.`,
    type: 'payment_claim',
    priority: 'high',
    recipients,
    requiresAction: true,
    actionType: 'claim_payment',
    actionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    relatedData: {
      paymentId: paymentData._id,
      leadId: paymentData.leadId
    }
  });
};

// Static method to create productivity alert
notificationSchema.statics.createProductivityAlert = function(employeeId, message) {
  return this.create({
    title: 'Productivity Alert',
    message,
    type: 'productivity_alert',
    priority: 'medium',
    recipients: [employeeId],
    requiresAction: true,
    actionType: 'review_lead'
  });
};

// Static method to create lead status notification
notificationSchema.statics.createLeadStatusNotification = function(leadData, recipients) {
  return this.create({
    title: 'Lead Status Update',
    message: `Lead ${leadData.leadId} status changed to ${leadData.status}`,
    type: 'lead_status',
    priority: 'medium',
    recipients,
    relatedData: {
      leadId: leadData.leadId
    }
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 