// User Model
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['employee', 'admin', 'super-admin', 'advocate'], default: 'employee' },
  isActive: { type: Boolean, default: true },
  ipWhitelist: [String],
  plainPassword: String, // ⚠️ For demo only, never use in production
  
  // Admin Onboarding Details
  adminId: { type: String, unique: true, sparse: true }, // Automatically generated admin ID
  personalMobile: String,
  companyMobile: String,
  referenceMobile: String, // Emergency/Reference mobile
  personalEmail: String,
  companyEmail: String,
  dateOfBirth: Date,
  
  // Identity Documents
  aadharCard: String,
  panCard: String,
  
  // Bank Details
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String,
    upiId: String
  },
  
  // Additional Info
  joinedThrough: String, // How they joined (referral, direct, etc.)
  additionalNotes: String,
  
  // Admin Access Permissions
  adminAccess: {
    employee: { type: Boolean, default: false },
    sales: { type: Boolean, default: false },
    operation: { type: Boolean, default: false },
    advocate: { type: Boolean, default: false },
    allThings: { type: Boolean, default: false } // All things from admin
  },
  
  // Status
  onboardingStatus: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String },
}, { timestamps: true });

// Generate admin ID before saving
userSchema.pre('save', function(next) {
  if (this.role === 'admin' && !this.adminId) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.adminId = `ADM${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
