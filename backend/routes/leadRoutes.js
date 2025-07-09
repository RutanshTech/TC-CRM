// Lead Routes
const express = require('express');
const router = express.Router();
const { authMiddleware, employeeAccessMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { 
  addLead, 
  getMyLeads, 
  getAllMyLeads, 
  updateLead,
  getLeadsForDistribution,
  distributeLeads,
  checkDuplicateLeads,
  getAssignedLeads,
  getLeadById,
  updateLeadByEmployee,
  uploadLeadFile,
  addLeadLog,
  addLeadChat,
  updatePaymentClaim,
  getPreviousLeads,
  assignLeadsToOperation,
  updateAdvocateFields,
  getLeadClaims,
  updateAdvocateStatusFields
} = require('../controllers/leadController');
const validateCall = require('../middlewares/callValidationMiddleware');
const { updateCallStatus } = require('../controllers/leadController');
const cloudinary = require('../config/cloudinary');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Employee-specific routes (require employee access)
router.post('/status', authMiddleware, employeeAccessMiddleware, validateCall, updateCallStatus);
router.patch('/:id/status', authMiddleware, employeeAccessMiddleware, updateCallStatus); // PATCH endpoint for updating call status
router.put('/:id/employee', authMiddleware, employeeAccessMiddleware, updateLeadByEmployee);

// Admin-only routes (require admin role)
router.get('/distribution', authMiddleware, roleMiddleware(['admin', 'super-admin']), getLeadsForDistribution); // Get leads for distribution
router.post('/distribute', authMiddleware, roleMiddleware(['admin', 'super-admin']), distributeLeads); // Distribute leads to employees
router.post('/duplicates', authMiddleware, roleMiddleware(['admin', 'super-admin']), checkDuplicateLeads); // Check for duplicate leads
router.get('/assigned', authMiddleware, getAssignedLeads); // Get assigned leads

// General routes (require authentication - works for both employees and admins)
router.post('/led', authMiddleware, addLead);           // Add new lead (admin or reference)
router.get('/my', authMiddleware, getMyLeads);       // Get my 5 leads (works for both employees and admins)
router.get('/all', authMiddleware, getAllMyLeads);       // Get all leads (works for both employees and admins)
router.put('/:id', authMiddleware, updateLead);
router.get('/:id', authMiddleware, getLeadById);

// File upload for lead (multi-file, employees/admins)
router.post('/:id/upload', authMiddleware, uploadLeadFile);

// File upload for lead - Drafting file only, multiple files (Operations)
router.post('/:id/upload-drafting', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.files || (!req.files.draft && !req.files.poa && !req.files.ua)) {
      return res.status(400).json({ message: 'No file uploaded. Please select a file to upload.' });
    }
    const Lead = require('../models/Lead');
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    const draftingFiles = {};
    if (req.files.draft) {
      const file = req.files.draft;
      const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: 'leads' });
      draftingFiles.draft = { url: result.secure_url, name: file.originalname || file.name };
    }
    if (req.files.poa) {
      const file = req.files.poa;
      const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: 'leads' });
      draftingFiles.poa = { url: result.secure_url, name: file.originalname || file.name };
    }
    if (req.files.ua) {
      const file = req.files.ua;
      const result = await cloudinary.uploader.upload(file.tempFilePath, { folder: 'leads' });
      draftingFiles.ua = { url: result.secure_url, name: file.originalname || file.name };
    }
    lead.draftingFiles = draftingFiles;
    await lead.save();
    res.json({ message: 'Files uploaded successfully', files: draftingFiles, leadId: lead._id });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload error', error: error.message });
  }
});

// Log and chat
router.post('/:id/log', authMiddleware, addLeadLog);
router.post('/:id/chat', authMiddleware, addLeadChat);

// Payment claim
router.put('/:id/payment-claim', authMiddleware, updatePaymentClaim);

// Previous leads
router.get('/employee/previous', authMiddleware, employeeAccessMiddleware, getPreviousLeads);

// Assign selected leads to Operations
router.post('/assign-to-operation', authMiddleware, assignLeadsToOperation);

// Assign leads to advocate
router.post('/assign-to-advocate', authMiddleware, async (req, res) => {
  try {
    const { leadIds, advocateId } = req.body;
    if (!Array.isArray(leadIds) || !advocateId) {
      return res.status(400).json({ message: 'leadIds (array) and advocateId are required' });
    }
    
    // Update leads with advocate assignment
    const result = await require('../models/Lead').updateMany(
      { _id: { $in: leadIds } },
      { assignedToAdvocate: advocateId }
    );
    
    // Send notification to the advocate user
    if (result.modifiedCount > 0) {
      try {
        const Notification = require('../models/Notification');
        const User = require('../models/User');
        
        // Get advocate user details
        const advocateUser = await User.findById(advocateId);
        
        if (advocateUser) {
          // Create notification for lead assignment
          const notification = await Notification.create({
            title: 'New Leads Assigned',
            message: `${result.modifiedCount} lead(s) have been assigned to you for processing.`,
            type: 'lead_status',
            priority: 'high',
            recipients: [advocateId],
            requiresAction: true,
            actionType: 'review_lead',
            relatedData: {
              leadId: leadIds.join(','),
              employeeId: advocateId
            },
            sender: req.user.id
          });
          
          // Send the notification
          await notification.sendNotification();
          
          console.log('DEBUG: Notification sent to advocate user:', advocateId);
        }
      } catch (notificationError) {
        console.error('DEBUG: Failed to send notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
    
    res.json({ message: 'Leads assigned to advocate' });
  } catch (error) {
    console.error('DEBUG: Error assigning leads to advocate:', error);
    res.status(500).json({ message: 'Failed to assign leads to advocate', error: error.message });
  }
});

// PATCH: Update advocate fields for a lead
router.patch('/:id/advocate-fields', authMiddleware, updateAdvocateFields);

// PATCH: Advocate can update only status fields
router.patch('/:id/advocate-status', authMiddleware, updateAdvocateStatusFields);

// Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, '../uploads', filename);
  res.sendFile(filePath);
});

// Get all payment claims for a lead
router.get('/:id/claims', authMiddleware, getLeadClaims);

module.exports = router;
