const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Notification Details
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'payment_claim', 
      'lead_status', 
      'employee_block', 
      'leave_approval', 
      'system_alert', 
      'productivity_alert',
      'lead_assignment',
      'payment_created',
      'access_granted',
      'leave_response',
      'admin_access_granted',
      'admin_password_changed'
    ], 
    required: true 
  },
  
  // Priority
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  
  // Recipients
  recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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
    leaveId: String,
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    paymentAmount: Number,
    paymentDate: Date,
    accessType: String,
    accessGrantedAt: Date,
    leaveResponse: String,
    leaveResponseBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminAccessType: String,
    adminAccessGrantedAt: Date,
    passwordChangedAt: Date,
    passwordChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
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

// Static method to create lead assignment notification
notificationSchema.statics.createLeadAssignmentNotification = function(leadData, employeeId, assignedBy) {
  return this.create({
    title: 'New Lead Assigned',
    message: `A new lead "${leadData.name}" has been assigned to you by ${assignedBy.name}.`,
    type: 'lead_assignment',
    priority: 'high',
    recipients: [employeeId],
    sender: assignedBy._id,
    relatedData: {
      leadId: leadData._id,
      employeeId: employeeId,
      assignedBy: assignedBy._id,
      assignedAt: new Date()
    }
  });
};

// Static method to create payment creation notification
notificationSchema.statics.createPaymentCreatedNotification = function(paymentData, employeeId, createdBy) {
  return this.create({
    title: 'Payment Created',
    message: `A payment of ₹${paymentData.amount} has been created for lead ${paymentData.leadId} by ${createdBy.name}.`,
    type: 'payment_created',
    priority: 'medium',
    recipients: [employeeId],
    sender: createdBy._id,
    relatedData: {
      paymentId: paymentData._id,
      leadId: paymentData.leadId,
      paymentAmount: paymentData.amount,
      paymentDate: new Date()
    }
  });
};

// Static method to create access granted notification
notificationSchema.statics.createAccessGrantedNotification = function(employeeId, accessType, grantedBy) {
  return this.create({
    title: 'Access Granted',
    message: `You have been granted ${accessType} access by ${grantedBy.name}.`,
    type: 'access_granted',
    priority: 'medium',
    recipients: [employeeId],
    sender: grantedBy._id,
    relatedData: {
      employeeId: employeeId,
      accessType: accessType,
      accessGrantedAt: new Date()
    }
  });
};

// Static method to create leave response notification
notificationSchema.statics.createLeaveResponseNotification = function(employeeId, leaveData, response, respondedBy) {
  const statusText = response === 'approved' ? 'approved' : 'rejected';
  return this.create({
    title: `Leave Application ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`,
    message: `Your leave application for ${leaveData.startDate.toDateString()} to ${leaveData.endDate.toDateString()} has been ${statusText} by ${respondedBy.name}.`,
    type: 'leave_response',
    priority: 'high',
    recipients: [employeeId],
    sender: respondedBy._id,
    relatedData: {
      employeeId: employeeId,
      leaveId: leaveData._id,
      leaveResponse: response,
      leaveResponseBy: respondedBy._id
    }
  });
};

// Static method to create admin access granted notification
notificationSchema.statics.createAdminAccessGrantedNotification = function(adminId, accessType, grantedBy) {
  return this.create({
    title: 'Admin Access Granted',
    message: `You have been granted ${accessType} access by ${grantedBy.name}.`,
    type: 'admin_access_granted',
    priority: 'high',
    recipients: [adminId],
    sender: grantedBy._id,
    relatedData: {
      employeeId: adminId,
      adminAccessType: accessType,
      adminAccessGrantedAt: new Date()
    }
  });
};

// Static method to create admin password change notification
notificationSchema.statics.createAdminPasswordChangedNotification = function(adminId, changedBy) {
  return this.create({
    title: 'Password Changed',
    message: `Your password has been changed by ${changedBy.name}.`,
    type: 'admin_password_changed',
    priority: 'high',
    recipients: [adminId],
    sender: changedBy._id,
    relatedData: {
      employeeId: adminId,
      passwordChangedAt: new Date(),
      passwordChangedBy: changedBy._id
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