const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const validatePhone = require('../utils/validatePhone');
const { getNextEmployee } = require('../services/roundRobinService');
const User = require('../models/User');
const Employee = require('../models/Employee');
const cloudinary = require('cloudinary').v2;
const PaymentCollection = require('../models/PaymentCollection');

// 🔹 Add a new lead (only admin/super-admin)
exports.addLead = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can add leads.' });
    }

    // Accept all fields from the document
    const {
      name,
      mobileNumbers,
      prospectStatus,
      leadStatus,
      operationStatus,
      email,
      city,
      services,
      classes,
      descriptionPerClass,
      brandName,
      firmType,
      followUpStatus,
      nextFollowUpDate,
      additionalNotes,
      manualFields,
      paymentClaim,
      payments,
      aadharCardFront,
      aadharCardBack,
      panCard,
      passportPhoto,
      companyPan,
      incorporationCertificate,
      msme,
      partnershipDeed,
      logo,
      additionalFiles,
      previousLeads
    } = req.body;

    let assignedTo = await getNextEmployee();

    // Prepare lead data
    const leadData = {
      name,
      mobileNumbers,
      prospectStatus,
      leadStatus,
      operationStatus,
      email,
      city,
      services,
      classes,
      descriptionPerClass,
      brandName,
      firmType,
      followUpStatus,
      nextFollowUpDate,
      additionalNotes,
      manualFields,
      paymentClaim,
      payments,
      aadharCardFront,
      aadharCardBack,
      panCard,
      passportPhoto,
      companyPan,
      incorporationCertificate,
      msme,
      partnershipDeed,
      logo,
      additionalFiles,
      previousLeads,
      assignedBy: req.user.id
    };
    if (assignedTo) {
      leadData.assignedTo = assignedTo;
    }

    const lead = await Lead.create(leadData);
    res.status(201).json({ message: 'Lead added successfully', lead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add lead', error: error.message });
  }
};

// 🔹 Get 5 leads assigned to logged-in employee (dashboard)
exports.getMyLeads = async (req, res) => {
  try {
    console.log('getMyLeads called by user:', {
      id: req.user.id,
      role: req.user.role,
      employeeId: req.user.employeeId
    });

    // Role check: Only admin, super-admin, employee, or advocate can access
    if (!req.user || !['admin', 'super-admin', 'employee', 'advocate'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Only admin, super-admin, employee, or advocate can access leads.',
        userRole: req.user?.role
      });
    }

    let filter = {};
    
    // For employees, only show their assigned leads
    if (req.user.role === 'employee') {
      filter = { assignedTo: req.user.id };
    }
    // For advocate, only show their assigned leads
    else if (req.user.role === 'advocate') {
      filter = { assignedToAdvocate: req.user.id };
    }
    // For admins, show all leads
    else if (['admin', 'super-admin'].includes(req.user.role)) {
      filter = {};
    }

    console.log('Using filter:', filter);

    const leads = await Lead.find(filter)
      .sort({ updatedAt: -1 })
      .limit(5);

    console.log(`Found ${leads.length} leads for user ${req.user.id}`);

    const formattedLeads = leads.map(formatLeadNumber);
    res.json(formattedLeads);
  } catch (error) {
    console.error('Error in getMyLeads:', error);
    res.status(500).json({ 
      message: 'Error fetching leads', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// 🔹 Get all leads assigned to employee or all if admin
exports.getAllMyLeads = async (req, res) => {
  try {
    let filter = {};
    if (['admin', 'super-admin'].includes(req.user.role)) {
      filter = {};
    } else if (req.user.role === 'operation') {
      filter = { assignedToOperation: req.user.id };
    } else if (req.user.role === 'advocate') {
      filter = { assignedToAdvocate: req.user.id };
    } else {
      filter = { assignedTo: req.user.id };
    }

    console.log('getAllMyLeads called by user:', req.user);
    console.log('Filter used:', filter);

    const leads = await Lead.find(filter).sort({ updatedAt: -1 });

    const formattedLeads = leads.map(formatLeadNumber);
    res.json(formattedLeads);
  } catch (error) {
    console.error('Error in getAllMyLeads:', error);
    res.status(500).json({ message: 'Error fetching all leads', error: error.message, stack: error.stack });
  }
};

// 🔹 Format lead number and extract cityCode
function formatLeadNumber(lead) {
  let cityCode = '', number;
  // Prefer lead.number, fallback to first mobileNumbers entry, else empty string
  if (lead.number) {
    number = lead.number;
  } else if (Array.isArray(lead.mobileNumbers) && lead.mobileNumbers.length > 0) {
    number = lead.mobileNumbers[0];
  } else {
    number = '';
  }
  const numStr = number ? number.toString() : '';

  if (numStr.startsWith('+')) {
    const match = numStr.match(/^\+(\d{1,4})(\d{10,})$/);
    if (match) {
      cityCode = '+' + match[1];
      number = match[2];
    }
  } else if (numStr.length === 12 && numStr.startsWith('91')) {
    cityCode = '+91';
    number = numStr.slice(2);
  } else if (numStr.length > 10) {
    cityCode = '+' + numStr.slice(0, numStr.length - 10);
    number = numStr.slice(numStr.length - 10);
  }

  return {
    ...lead.toObject(),
    cityCode,
    number: number.toString()
  };
}

// 🔹 Update call status
exports.updateCallStatus = async (req, res) => {
  // Only employees can update call status
  if (!req.user || req.user.role !== 'employee') {
    return res.status(403).json({ message: 'Only employees can update call status.' });
  }

  try {
    const leadId = req.params.id;
    const { callStatus } = req.body;

    if (!callStatus) {
      return res.status(400).json({ message: 'callStatus is required.' });
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { followUpStatus: callStatus },
      { new: true }
    );

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    res.json({ message: 'Call status updated successfully', lead: updatedLead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update call status', error: error.message });
  }
};

// 🔹 Admin-only lead update
exports.updateLead = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can edit leads.' });
    }
    const { id } = req.params;
    // Accept all fields from the document
    const updateFields = req.body;
    console.log('DEBUG updateLead:', { id, updateFields });
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }
    res.json({ message: 'Lead updated successfully', lead: updatedLead });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update lead', error: error.message });
  }
};

// 🔹 Get leads for distribution (unassigned leads)
exports.getLeadsForDistribution = async (req, res) => {
  try {
    console.log('getLeadsForDistribution called by user:', {
      id: req.user?.id,
      role: req.user?.role,
      email: req.user?.email
    });

    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can access lead distribution.' });
    }

    const { showDuplicate, showAssigned } = req.query;
    
    let query = {};
    
    // If showing assigned leads, include them, otherwise only unassigned
    if (showAssigned === 'true') {
      // Show all leads
    } else {
      query.assignedTo = { $exists: false };
    }

    console.log('MongoDB query:', query);

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name employeeId')
      .sort({ createdAt: -1 });

    console.log(`Found ${leads.length} leads for distribution`);

    let processedLeads = leads.map(lead => ({
      id: lead._id,
      phoneNumber: lead.number || (lead.mobileNumbers && lead.mobileNumbers[0]) || '',
      brandName: lead.brandName || '',
      notes: lead.name || '',
      assigned: !!lead.assignedTo,
      assignedTo: lead.assignedTo ? {
        name: lead.assignedTo.name,
        employeeId: lead.assignedTo.employeeId
      } : null,
      assignedAt: lead.assignedTo ? lead.updatedAt : null,
      isDuplicate: false
    }));

    // Check for duplicates if requested
    if (showDuplicate === 'true') {
      const phoneNumbers = leads.map(lead => lead.number || (lead.mobileNumbers && lead.mobileNumbers[0]) || '');
      const duplicates = phoneNumbers.filter((phone, index) => 
        phoneNumbers.indexOf(phone) !== index
      );
      
      processedLeads = processedLeads.map(lead => ({
        ...lead,
        isDuplicate: duplicates.includes(lead.phoneNumber)
      }));
    }

    console.log(`Returning ${processedLeads.length} processed leads`);
    res.json({ leads: processedLeads });
  } catch (error) {
    console.error('Error in getLeadsForDistribution:', error);
    res.status(500).json({ 
      message: 'Error fetching leads for distribution', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// 🔹 Distribute leads to employees
exports.distributeLeads = async (req, res) => {
  try {
    console.log('DEBUG: distributeLeads called by user:', req.user);
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can distribute leads.' });
    }

    const { leadIds, employeeIds } = req.body;

    if (!leadIds || !employeeIds || !Array.isArray(leadIds) || !Array.isArray(employeeIds)) {
      return res.status(400).json({ message: 'leadIds and employeeIds arrays are required.' });
    }

    if (leadIds.length === 0 || employeeIds.length === 0) {
      return res.status(400).json({ message: 'At least one lead and one employee must be selected.' });
    }

    // Verify all employees exist and are active
    const employees = await Employee.find({ 
      employeeId: { $in: employeeIds },
      isActive: true,
      status: { $in: ['online', 'offline'] }
    });

    if (employees.length !== employeeIds.length) {
      return res.status(400).json({ message: 'Some selected employees are not found or inactive.' });
    }

    // Verify all leads exist and are unassigned
    const leads = await Lead.find({ 
      _id: { $in: leadIds },
      assignedTo: { $exists: false }
    });

    if (leads.length !== leadIds.length) {
      return res.status(400).json({ message: 'Some selected leads are not found or already assigned.' });
    }

    // Distribute leads using round-robin or equal distribution
    const distribution = [];
    const employeeIdsForAssignment = employees.map(emp => emp._id);
    
    for (let i = 0; i < leads.length; i++) {
      const employeeIndex = i % employeeIdsForAssignment.length;
      const assignedEmployeeId = employeeIdsForAssignment[employeeIndex];
      
      distribution.push({
        leadId: leads[i]._id,
        employeeId: assignedEmployeeId
      });
    }

    // Update leads with assignments
    const updatePromises = distribution.map(({ leadId, employeeId }) => {
      console.log('DEBUG: Assigning lead', leadId, 'to', employeeId, 'by', req.user._id);
      return Lead.findByIdAndUpdate(leadId, {
        assignedTo: employeeId,
        assignedBy: req.user._id,
        assignedAt: new Date()
      });
    });

    await Promise.all(updatePromises);

    // Update employee lead counts
    const employeeUpdatePromises = employees.map(employee => {
      const assignedLeadsCount = distribution.filter(d => 
        d.employeeId.toString() === employee._id.toString()
      ).length;
      
      return Employee.findByIdAndUpdate(employee._id, {
        $inc: { 
          leadsAssigned: assignedLeadsCount,
          leadsPending: assignedLeadsCount
        }
      });
    });

    await Promise.all(employeeUpdatePromises);

    res.json({ 
      message: 'Leads distributed successfully',
      distribution: distribution.map(d => ({
        leadId: d.leadId,
        employeeId: employees.find(e => e._id.toString() === d.employeeId.toString())?.employeeId
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Lead distribution failed', error: error.message });
  }
};

// 🔹 Check for duplicate leads
exports.checkDuplicateLeads = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can check for duplicates.' });
    }

    const { phoneNumbers } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({ message: 'phoneNumbers array is required.' });
    }

    const duplicates = await Lead.aggregate([
      {
        $match: {
          number: { $in: phoneNumbers }
        }
      },
      {
        $group: {
          _id: '$number',
          count: { $sum: 1 },
          leads: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    res.json({ duplicates });
  } catch (error) {
    res.status(500).json({ message: 'Error checking for duplicates', error: error.message });
  }
};

// 🔹 Get assigned leads with employee details
exports.getAssignedLeads = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // If employee, return only their assigned leads
    if (req.user.role === 'employee') {
      const leads = await Lead.find({ assignedTo: req.user.id })
        .populate({ path: 'assignedTo', select: 'name employeeId role', model: 'Employee' })
        .populate({ path: 'assignedBy', select: 'name role', model: 'User' })
        .sort({ assignedAt: -1 });
      const assignedLeads = leads.map(lead => ({
        id: lead._id,
        phoneNumber: lead.number,
        brandName: lead.brandName,
        notes: lead.name,
        assignedTo: lead.assignedTo
          ? {
              name: lead.assignedTo.name,
              employeeId: lead.assignedTo.employeeId,
              role: lead.assignedTo.role
            }
          : null,
        assignedBy: lead.assignedBy
          ? (lead.assignedBy.role === 'admin'
              ? {
                  id: lead.assignedBy.id,
                  name: lead.assignedBy.name,
                  role: lead.assignedBy.role
                }
              : {
                  id: lead.assignedBy._id,
                  name: lead.assignedBy.name,
                  role: lead.assignedBy.role
                }
            )
          : null,
        assignedAt: lead.assignedAt || lead.updatedAt
      }));
      return res.json({ assignedLeads });
    }

    // If admin or super-admin, return all assigned leads
    if (!['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin, super-admin, or employee can view assigned leads.' });
    }

    const leads = await Lead.find({ assignedTo: { $exists: true, $ne: null } })
      .populate({ path: 'assignedTo', select: 'name employeeId role', model: 'Employee' })
      .populate({ path: 'assignedBy', select: 'name role', model: 'User' })
      .sort({ assignedAt: -1 });
    const assignedLeads = leads.map(lead => ({
      id: lead._id,
      phoneNumber: lead.number,
      brandName: lead.brandName,
      notes: lead.name,
      assignedTo: lead.assignedTo
        ? {
            name: lead.assignedTo.name,
            employeeId: lead.assignedTo.employeeId,
            role: lead.assignedTo.role
          }
        : null,
      assignedBy: lead.assignedBy
        ? (lead.assignedBy.role === 'admin'
            ? {
                id: lead.assignedBy.id,
                name: lead.assignedBy.name,
                role: lead.assignedBy.role
              }
            : {
                id: lead.assignedBy._id,
                name: lead.assignedBy.name,
                role: lead.assignedBy.role
              }
          )
        : null,
      assignedAt: lead.assignedAt || lead.updatedAt
    }));
    res.json({ assignedLeads });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned leads', error: error.message });
  }
};

// Get a single lead by ID (with all fields)
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name employeeId')
      .populate('assignedBy', 'name')
      .populate('paymentClaim.paymentCollection')
      .populate('previousLeads', 'name');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lead', error: error.message });
  }
};

// Update a lead by employee (all fields except assignment)
exports.updateLeadByEmployee = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    
    // Debug log for assignedTo and req.user.id
    console.log('DEBUG updateLeadByEmployee:', {
      assignedTo: lead.assignedTo?.toString(),
      reqUserId: req.user.id,
      reqUser: req.user,
      assignedToType: typeof lead.assignedTo,
      reqUserIdType: typeof req.user.id
    });
    
    // Only allow assigned employee to update
    // Convert both to strings for proper comparison
    const assignedToStr = lead.assignedTo?.toString();
    const reqUserIdStr = req.user.id?.toString();
    
    if (!lead.assignedTo || assignedToStr !== reqUserIdStr) {
      return res.status(403).json({ 
        message: 'Not authorized to update this lead. Only the assigned employee can update this lead.',
        debug: {
          assignedTo: assignedToStr,
          reqUserId: reqUserIdStr,
          assignedToExists: !!lead.assignedTo,
          comparison: assignedToStr === reqUserIdStr
        }
      });
    }
    
    // Update only the allowed fields for employees
    const allowedFields = ['name', 'email', 'city', 'firmType', 'followUpStatus', 'additionalNotes', 'prospectStatus', 'leadStatus', 'operationStatus', 'nextFollowUpDate', 'descriptionPerClass', 'services', 'classes', 'payments'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Validate email format
        if (field === 'email' && req.body[field]) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(req.body[field])) {
            return res.status(400).json({ message: 'Invalid email format' });
          }
        }
        
        // Validate date format
        if (field === 'nextFollowUpDate' && req.body[field]) {
          const date = new Date(req.body[field]);
          if (isNaN(date.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
          }
        }
        
        updateData[field] = req.body[field];
      }
    });
    
    console.log('DEBUG updateLeadByEmployee:', { id: req.params.id, updateData });
    Object.assign(lead, updateData);
    await lead.save();
    
    console.log('Lead updated successfully:', {
      leadId: lead._id,
      updatedFields: Object.keys(updateData),
      updatedBy: req.user.id
    });
    
    res.json({ message: 'Lead updated successfully', lead });
  } catch (error) {
    console.error('Error in updateLeadByEmployee:', error);
    res.status(500).json({ message: 'Error updating lead', error: error.message });
  }
};

// Upload multiple files for a lead (all fields at once)
exports.uploadLeadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    // For each file field, save to lead
    const fileFields = [
      'aadharCardFront', 'aadharCardBack', 'panCard', 'passportPhoto', 'companyPan',
      'incorporationCertificate', 'msme', 'partnershipDeed', 'logo', 'additionalFiles', 'batchGovReceiptFile'
    ];
    for (const field of fileFields) {
      if (req.files[field]) {
        if (field === 'additionalFiles') {
          // Array of files or single file
          if (Array.isArray(req.files[field])) {
            for (const fileObj of req.files[field]) {
              try {
                const result = await cloudinary.uploader.upload(fileObj.tempFilePath, { folder: 'leads' });
                const fileData = { url: result.secure_url, name: fileObj.originalname };
                lead.additionalFiles.push(fileData);
              } catch (err) {
                console.error('Cloudinary upload error (additionalFiles):', err);
              }
            }
          } else {
            // Single file
            const fileObj = req.files[field];
            try {
              const result = await cloudinary.uploader.upload(fileObj.tempFilePath, { folder: 'leads' });
              const fileData = { url: result.secure_url, name: fileObj.originalname };
            lead.additionalFiles.push(fileData);
            } catch (err) {
              console.error('Cloudinary upload error (additionalFiles single):', err);
            }
          }
        } else {
          // Single file
          const fileObj = Array.isArray(req.files[field]) ? req.files[field][0] : req.files[field];
          try {
            const result = await cloudinary.uploader.upload(fileObj.tempFilePath, { folder: 'leads' });
            const fileData = { url: result.secure_url, name: fileObj.originalname };
          lead[field] = fileData;
          } catch (err) {
            console.error(`Cloudinary upload error (${field}):`, err);
          }
        }
      }
    }
    await lead.save();
    res.json({ message: 'Files uploaded', files: req.files });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading files', error: error.message });
  }
};

// Add a log entry to a lead
exports.addLeadLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, details } = req.body;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.log.push({ action, user: req.user.id, details });
    await lead.save();
    res.json({ message: 'Log added' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding log', error: error.message });
  }
};

// Add a chat message to a lead
exports.addLeadChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.chat.push({ sender: req.user.id, message });
    await lead.save();
    res.json({ message: 'Chat message added' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding chat', error: error.message });
  }
};

// Update payment claim info for a lead
exports.updatePaymentClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { govtFees, advocateFees, userStamp, otherFees, paymentCollection } = req.body;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    const total = [govtFees, advocateFees, userStamp, otherFees].map(Number).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    lead.paymentClaim = { govtFees, advocateFees, userStamp, otherFees, paymentCollection, total };
    await lead.save();
    res.json({ message: 'Payment claim updated' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment claim', error: error.message });
  }
};

// Get previous leads for a user
exports.getPreviousLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ assignedTo: req.user.id }).sort({ createdAt: -1 }).limit(10);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching previous leads', error: error.message });
  }
};

// Assign selected leads to an Operations user
exports.assignLeadsToOperation = async (req, res) => {
  try {
    const { leadIds, operationId } = req.body;
    console.log('DEBUG assignLeadsToOperation:', { leadIds, operationId });
    if (!Array.isArray(leadIds) || !operationId) {
      return res.status(400).json({ message: 'leadIds (array) and operationId are required.' });
    }
    // Only employees or admins can assign leads to operations
    if (!req.user || !['employee', 'admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    
    // Update leads with operation assignment
    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedToOperation: operationId } }
    );
    
    // Send notification to the operation user
    if (result.modifiedCount > 0) {
      try {
        const Notification = require('../models/Notification');
        const User = require('../models/User');
        
        // Get operation user details
        const operationUser = await User.findById(operationId);
        
        if (operationUser) {
          // Create notification for lead assignment
          const notification = await Notification.create({
            title: 'New Leads Assigned',
            message: `${result.modifiedCount} lead(s) have been assigned to you for processing.`,
            type: 'lead_status',
            priority: 'high',
            recipients: [operationId],
            requiresAction: true,
            actionType: 'review_lead',
            relatedData: {
              leadId: leadIds.join(','),
              employeeId: operationId
            },
            sender: req.user.id
          });
          
          // Send the notification
          await notification.sendNotification();
          
          console.log('DEBUG: Notification sent to operation user:', operationId);
        }
      } catch (notificationError) {
        console.error('DEBUG: Failed to send notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }
    
    console.log('DEBUG assignLeadsToOperation result:', result);
    res.json({ message: 'Leads assigned to Operations successfully.', result });
  } catch (error) {
    console.error('DEBUG assignLeadsToOperation error:', error);
    res.status(500).json({ message: 'Failed to assign leads to Operations', error: error.message });
  }
};

// Add/Update advocate fields for a lead
exports.updateAdvocateFields = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const lead = await Lead.findByIdAndUpdate(id, updateFields, { new: true });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json({ message: 'Advocate fields updated', lead });
  } catch (error) {
    res.status(500).json({ message: 'Error updating advocate fields', error: error.message });
  }
};

// Get all payment claims for a lead
exports.getLeadClaims = async (req, res) => {
  try {
    const { id } = req.params;
    // Find all payment claims for this lead (leadId is stored as string)
    const claims = await PaymentCollection.find({
      leadId: id.toString(),
      status: { $in: ['claimed', 'verified'] }
    })
    .populate('claimedBy', 'name employeeId')
    .sort({ claimedAt: -1 });
    res.json({ count: claims.length, claims });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch claims', error: error.message });
  }
};

// Advocate can update only status fields
exports.updateAdvocateStatusFields = async (req, res) => {
  try {
    console.log('DEBUG: updateAdvocateStatusFields called by:', req.user);
    if (!req.user || req.user.role !== 'advocate') {
      return res.status(403).json({ message: 'Only advocate can update these fields.' });
    }
    const { id } = req.params;
    const allowedFields = ['pendingForESign', 'govtPaymentDone', 'fillingDone'];
    const updateFields = {};
    allowedFields.forEach(field => {
      if (field in req.body) updateFields[field] = req.body[field];
    });
    console.log('DEBUG: Updating lead', id, 'with fields:', updateFields);
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }
    const updatedLead = await require('../models/Lead').findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }
    console.log('DEBUG: Lead updated successfully:', {
      leadId: updatedLead._id,
      updatedFields: updateFields,
      newValues: {
        pendingForESign: updatedLead.pendingForESign,
        govtPaymentDone: updatedLead.govtPaymentDone,
        fillingDone: updatedLead.fillingDone
      }
    });
    res.json({ message: 'Status fields updated', lead: updatedLead });
  } catch (error) {
    console.error('DEBUG: Error updating status fields:', error);
    res.status(500).json({ message: 'Failed to update status fields', error: error.message });
  }
};
