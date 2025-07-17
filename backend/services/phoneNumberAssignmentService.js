const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendNotificationToUser } = require('../controllers/notificationController');

/**
 * Get phone number assignment for a given phone number
 * @param {string} phoneNumber - The phone number to check
 * @returns {Object|null} - Assignment details or null if not assigned
 */
async function getPhoneNumberAssignment(phoneNumber) {
  try {
    console.log('DEBUG: getPhoneNumberAssignment called with:', phoneNumber);
    
    // Normalize phone number for comparison
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('DEBUG: Normalized phone number:', normalizedPhone);
    
    // Find lead with this phone number that is assigned
    const assignedLead = await Lead.findOne({
      $or: [
        { number: normalizedPhone },
        { mobileNumbers: normalizedPhone }
      ],
      assignedTo: { $exists: true, $ne: null }
    }).populate('assignedTo', 'name employeeId _id');
    
    console.log('Found assigned lead:', assignedLead ? assignedLead._id : 'none');
    
    return assignedLead ? {
      employeeId: assignedLead.assignedTo._id,
      employeeName: assignedLead.assignedTo.name,
      employeeEmployeeId: assignedLead.assignedTo.employeeId,
      leadId: assignedLead._id
    } : null;
  } catch (error) {
    console.error('Error in getPhoneNumberAssignment:', error);
    return null;
  }
}

/**
 * Validate lead assignments based on phone number rules
 * @param {Array} leadIds - Array of lead IDs to assign
 * @param {Array} employeeIds - Array of employee IDs to assign to
 * @returns {Object} - Validation result with success status and any errors
 */
async function validateLeadAssignments(leadIds, employeeIds) {
  console.log('DEBUG: validateLeadAssignments called with:', { leadIds, employeeIds });
  console.log('DEBUG: leadIds type:', typeof leadIds, 'isArray:', Array.isArray(leadIds));
  console.log('DEBUG: employeeIds type:', typeof employeeIds, 'isArray:', Array.isArray(employeeIds));
  
  const errors = [];
  const validAssignments = [];
  
  // Get all leads with their phone numbers
  const leads = await Lead.find({ _id: { $in: leadIds } });
  console.log('DEBUG: Found leads:', leads.length);
  console.log('DEBUG: Lead IDs found:', leads.map(l => l._id));
  
  // Get all employees - handle both _id and employeeId formats
  let employees;
  if (employeeIds.length > 0 && typeof employeeIds[0] === 'string') {
    // Check if these look like MongoDB ObjectIds
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(employeeIds[0]);
    console.log('DEBUG: employeeIds[0]:', employeeIds[0], 'isObjectId:', isObjectId);
    
    if (isObjectId) {
      // These are MongoDB _id values
      employees = await Employee.find({ 
        _id: { $in: employeeIds },
        isActive: true,
        status: { $in: ['online', 'offline'] }
      });
    } else {
      // These are employeeId values (like "EMP001")
      employees = await Employee.find({ 
        employeeId: { $in: employeeIds },
        isActive: true,
        status: { $in: ['online', 'offline'] }
      });
    }
  } else {
    // Default to _id lookup
    employees = await Employee.find({ 
      _id: { $in: employeeIds },
      isActive: true,
      status: { $in: ['online', 'offline'] }
    });
  }
  
  console.log('DEBUG: Found employees:', employees.length);
  
  if (employees.length !== employeeIds.length) {
    return {
      success: false,
      errors: ['Some selected employees are not found or inactive.'],
      validAssignments: [],
      employees: []
    };
  }
  
  const employeeIdsForAssignment = employees.map(emp => emp._id);
  let employeeIndex = 0;
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const phoneNumber = lead.number || (lead.mobileNumbers && lead.mobileNumbers[0]) || '';
    
    if (!phoneNumber) {
      errors.push(`Lead ${lead._id} has no valid phone number`);
      continue;
    }
    
    // Normalize phone number for comparison
    const normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Check if this phone number is already assigned
    const existingAssignment = await getPhoneNumberAssignment(normalizedPhone);
    
    if (existingAssignment) {
      // Phone number is already assigned - check if trying to assign to different employee
      const targetEmployeeId = employeeIdsForAssignment[employeeIndex % employeeIdsForAssignment.length];
      
      if (existingAssignment.employeeId.toString() !== targetEmployeeId.toString()) {
        errors.push(`Phone number ${normalizedPhone} is already assigned to ${existingAssignment.employeeName} (${existingAssignment.employeeEmployeeId}). Cannot assign to different employee.`);
      } else {
        // Same employee - this is valid
        validAssignments.push({
          leadId: lead._id,
          employeeId: targetEmployeeId,
          phoneNumber: normalizedPhone,
          isReassignment: true
        });
        employeeIndex++;
      }
    } else {
      // Phone number not assigned - can assign to any employee using round-robin
      const targetEmployeeId = employeeIdsForAssignment[employeeIndex % employeeIdsForAssignment.length];
      validAssignments.push({
        leadId: lead._id,
        employeeId: targetEmployeeId,
        phoneNumber: normalizedPhone,
        isReassignment: false
      });
      employeeIndex++;
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
    validAssignments,
    employees: employees
  };
}

/**
 * Assign leads to employees with phone number validation
 * @param {Array} leadIds - Array of lead IDs
 * @param {Array} employeeIds - Array of employee IDs
 * @param {string} assignedBy - User ID who is making the assignment
 * @returns {Object} - Assignment result
 */
async function assignLeadsWithPhoneValidation(leadIds, employeeIds, assignedBy) {
  console.log('DEBUG: assignLeadsWithPhoneValidation called with:', {
    leadIds,
    employeeIds,
    assignedBy
  });
  
  console.log('DEBUG: leadIds type:', typeof leadIds, 'isArray:', Array.isArray(leadIds));
  console.log('DEBUG: employeeIds type:', typeof employeeIds, 'isArray:', Array.isArray(employeeIds));
  
  const validation = await validateLeadAssignments(leadIds, employeeIds);
  
  console.log('DEBUG: validation result:', validation);
  
  if (!validation.success) {
    console.log('DEBUG: Validation failed with errors:', validation.errors);
    return {
      success: false,
      errors: validation.errors,
      message: 'Lead assignment validation failed'
    };
  }
  
  // Get the user who is making the assignment
  const assignedByUser = await User.findById(assignedBy);
  if (!assignedByUser) {
    return {
      success: false,
      errors: ['User making assignment not found'],
      message: 'Assignment failed - user not found'
    };
  }
  
  // Perform the assignments
  const updatePromises = validation.validAssignments.map(async ({ leadId, employeeId }) => {
    const updatedLead = await Lead.findByIdAndUpdate(leadId, {
      assignedTo: employeeId,
      assignedBy: assignedBy,
      assignedAt: new Date()
    }, { new: true });
    
    // Send notification to employee about the assignment
    if (updatedLead) {
      try {
        const notification = await Notification.createLeadAssignmentNotification(
          updatedLead,
          employeeId,
          assignedByUser
        );
        
        // Send real-time notification
        await sendNotificationToUser(employeeId, notification);
        
      } catch (notificationError) {
        console.error('Failed to send lead assignment notification:', notificationError);
        // Don't fail the assignment if notification fails
      }
    }
    
    return updatedLead;
  });
  
  await Promise.all(updatePromises);
  
  // Update employee lead counts
  const employeeUpdatePromises = validation.employees.map(employee => {
    const assignedLeadsCount = validation.validAssignments.filter(assignment => 
      assignment.employeeId.toString() === employee._id.toString()
    ).length;
    
    return Employee.findByIdAndUpdate(employee._id, {
      $inc: { 
        leadsAssigned: assignedLeadsCount,
        leadsPending: assignedLeadsCount
      }
    });
  });
  
  await Promise.all(employeeUpdatePromises);
  
  return {
    success: true,
    message: 'Leads assigned successfully',
    assignments: validation.validAssignments,
    reassignments: validation.validAssignments.filter(a => a.isReassignment).length,
    newAssignments: validation.validAssignments.filter(a => !a.isReassignment).length
  };
}

module.exports = {
  getPhoneNumberAssignment,
  validateLeadAssignments,
  assignLeadsWithPhoneValidation
}; 