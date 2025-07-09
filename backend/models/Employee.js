const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['employee'], default: 'employee' },
  isActive: { type: Boolean, default: true },
  plainPassword: String, // ⚠️ For demo only, never use in production
  
  // Employee Onboarding Details
  employeeId: { type: String, unique: true, sparse: true }, // Automatically generated employee ID
  personalMobile: { type: String, required: false }, // Made optional
  companyMobile: String,
  referenceMobile: String, // Emergency/Reference mobile
  personalEmail: String,
  companyEmail: { type: String, required: false }, // Made optional
  dateOfBirth: Date,
  
  // Identity Documents
  aadharCard: { type: String, required: false }, // Made optional
  panCard: { type: String, required: false }, // Made optional
  
  // Bank Details
  bankDetails: {
    accountNumber: { type: String, required: false }, // Made optional
    ifscCode: { type: String, required: false }, // Made optional
    bankName: { type: String, required: false }, // Made optional
    accountHolderName: { type: String, required: false }, // Made optional
    upiId: String
  },
  
  // Additional Info
  joinedThrough: String, // How they joined (referral, direct, etc.)
  additionalNotes: String,
  
  // Status and Activity Tracking
  status: { 
    type: String, 
    enum: ['online', 'offline', 'on_leave', 'blocked'], 
    default: 'offline' 
  },
  lastActiveTime: Date,
  lastActivity: String,
  
  // Productivity Metrics
  productivity: {
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 }
  },
  
  // Time Tracking
  onlineTime: { type: Number, default: 0 }, // in minutes
  blockedTime: { type: Number, default: 0 }, // in minutes
  breakTime: { type: Number, default: 0 }, // in minutes
  
  // Lead Management
  leadsAssigned: { type: Number, default: 0 },
  leadsPending: { type: Number, default: 0 },
  leadsClosed: { type: Number, default: 0 },
  leadsCNP: { type: Number, default: 0 }, // CNP = Could Not Process
  leadsNotInterested: { type: Number, default: 0 },
  leadsFollowUp: { type: Number, default: 0 },
  
  // Payment Collection
  paymentCollection: { type: Number, default: 0 },
  pendingPayment: { type: Number, default: 0 },
  
  // Access Permissions
  access: {
    sales: { type: Boolean, default: false },
    operation: { type: Boolean, default: false },
    advocate: { type: Boolean, default: false },
    leadAdd: { type: Boolean, default: false },
    copy: { type: Boolean, default: false }
  },
  
  // Rules and Settings
  rules: {
    breakTime: { type: Number, default: 60 }, // in minutes
    meetingTime: { type: Number, default: 30 }, // in minutes
    officeTime: { type: Number, default: 480 }, // in minutes (8 hours)
    noLoginAfterOffice: { type: Boolean, default: true },
    blockingRules: {
      inactivityThreshold: { type: Number, default: 30 }, // minutes
      lateCheckIn: { type: Boolean, default: true },
      breakTimeNoBlocking: { type: Boolean, default: true },
      breakTimeBuffer: { type: Number, default: 5 }, // minutes
      consecutiveCNPThreshold: { type: Number, default: 3 }
    }
  },
  
  // Blocking Status
  isBlocked: { type: Boolean, default: false },
  blockedReason: String,
  blockedAt: Date,
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Attendance
  manualAttendance: [{
    date: { type: Date, required: true },
    checkIn: Date,
    checkOut: Date,
    status: { type: String, enum: ['present', 'absent', 'half-day', 'leave'], default: 'present' },
    notes: String
  }],
  
  // Leave Management
  leaveApplications: [{
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    notes: String
  }],
  
  // Activity Logs
  activityLogs: [{
    timestamp: { type: Date, default: Date.now },
    activity: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Onboarding Status
  onboardingStatus: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
  
  // Creation tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel' }, // Who created this employee
  createdByModel: { type: String, enum: ['User', 'Employee'], default: 'User' }, // Which model created this employee
  createdByRole: { type: String, enum: ['super-admin', 'admin'] } // Which role created this employee
}, { timestamps: true });

// Generate employee ID before saving
employeeSchema.pre('save', function(next) {
  if (!this.employeeId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.employeeId = `EMP${timestamp}${random}`;
  }
  next();
});

// Virtual for color code based on status
employeeSchema.virtual('colorCode').get(function() {
  switch (this.status) {
    case 'on_leave':
      return 'yellow';
    case 'blocked':
      return 'red';
    case 'online':
      return 'green';
    default:
      return 'gray';
  }
});

// Method to update productivity
employeeSchema.methods.updateProductivity = function(period, value) {
  this.productivity[period] = value;
  return this.save();
};

// Method to log activity
employeeSchema.methods.logActivity = function(activity, details = {}) {
  this.activityLogs.push({
    timestamp: new Date(),
    activity,
    details
  });
  this.lastActivity = activity;
  this.lastActiveTime = new Date();
  return this.save();
};

// Method to block employee
employeeSchema.methods.blockEmployee = function(reason, blockedBy) {
  this.isBlocked = true;
  this.status = 'blocked';
  this.blockedReason = reason;
  this.blockedAt = new Date();
  this.blockedBy = blockedBy;
  return this.save();
};

// Method to unblock employee
employeeSchema.methods.unblockEmployee = function() {
  this.isBlocked = false;
  this.status = 'offline';
  this.blockedReason = null;
  this.blockedAt = null;
  this.blockedBy = null;
  return this.save();
};

module.exports = mongoose.model('Employee', employeeSchema); 