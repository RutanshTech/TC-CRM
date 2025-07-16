const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const operationSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['operation'], default: 'operation' },
  isActive: { type: Boolean, default: true },
  plainPassword: String, // ⚠️ For demo only, never use in production
  
  // Filling and Client Details
  fillingText: { type: String },
  clients: { type: Boolean, default: false },
  afterPaymentMarkDoneLeadsMoveToClients: { type: Boolean, default: false },
  leadTransferToAdvocate: { type: Boolean, default: false },
  
  // Status and Activity Tracking
  status: { 
    type: String, 
    enum: ['online', 'offline', 'blocked'], 
    default: 'offline' 
  },
  lastActiveTime: Date,
  lastActivity: String,
  
  // Blocking Status
  isBlocked: { type: Boolean, default: false },
  blockedReason: String,
  blockedAt: Date,
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Activity Logs
  activityLogs: [{
    timestamp: { type: Date, default: Date.now },
    activity: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // Creation tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel' },
  createdByModel: { type: String, enum: ['User', 'Employee'], default: 'User' },
  createdByRole: { type: String, enum: ['super-admin', 'admin'] }
}, { timestamps: true });

// Hash password before saving
operationSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Virtual for color code based on status
operationSchema.virtual('colorCode').get(function() {
  switch (this.status) {
    case 'blocked':
      return 'red';
    case 'online':
      return 'green';
    default:
      return 'gray';
  }
});

// Method to log activity
operationSchema.methods.logActivity = function(activity, details = {}) {
  this.activityLogs.push({
    timestamp: new Date(),
    activity,
    details
  });
  this.lastActivity = activity;
  this.lastActiveTime = new Date();
  return this.save();
};

// Method to block operation
operationSchema.methods.blockOperation = function(reason, blockedBy) {
  this.isBlocked = true;
  this.status = 'blocked';
  this.blockedReason = reason;
  this.blockedAt = new Date();
  this.blockedBy = blockedBy;
  return this.save();
};

// Method to unblock operation
operationSchema.methods.unblockOperation = function() {
  this.isBlocked = false;
  this.status = 'offline';
  this.blockedReason = null;
  this.blockedAt = null;
  this.blockedBy = null;
  return this.save();
};

// Method to compare password
operationSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Operation', operationSchema); 