const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { sendNotificationToUser } = require('./notificationController');
const Lead = require('../models/Lead');

// Get all employees with filters
exports.getAllEmployees = async (req, res) => {
  try {
    console.log('getAllEmployees called with query:', req.query);
    console.log('Employee model available:', Employee ? 'Yes' : 'No');
    console.log('User role:', req.user.role);
    
    const { status, search, page = 1, limit = 10, all } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role-based filtering: Admin can only see employees they created
    // if (req.user.role === 'admin') {
    //   query.createdBy = req.user.id;
    // }
    // Super Admin can see all employees
    
    console.log('MongoDB query:', query);
    let employees;
    let total;
    if (all === 'true' || all === true) {
      // Return all employees without pagination
      employees = await Employee.find(query)
        .select('-password')
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 });
      total = employees.length;
      console.log('DEBUG: all=true param detected, employees fetched:', employees.length);
    } else {
      const skip = (page - 1) * limit;
      employees = await Employee.find(query)
        .select('-password')
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      total = await Employee.countDocuments(query);
    }
    console.log('Found employees:', employees.length);
    console.log('Total employees:', total);
    
    const response = {
      employees: employees.map(emp => ({
        ...emp.toObject(),
        createdByInfo: emp.createdBy ? {
          name: emp.createdBy.name,
          role: emp.createdBy.role
        } : null
      })),
      pagination: all === 'true' || all === true ? undefined : {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      },
      userRole: req.user.role,
      canCreateWithoutAccess: req.user.role === 'super-admin'
    };
    
    console.log('Sending response with', response.employees.length, 'employees');
    res.json(response);
  } catch (error) {
    console.error('Error in getAllEmployees:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch employees', 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Create new employee with comprehensive onboarding
exports.createEmployee = async (req, res) => {
  try {
    console.log('Creating employee with data:', req.body);
    console.log('User role:', req.user.role);

    // Check if user is Super Admin or Admin with employee creation permission
    if (!req.user || !['super-admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only Super Admin or Admin can create employees.' });
    }

    // If user is Admin (not Super Admin), check if they have employee creation permission
    if (req.user.role === 'admin') {
      if (!req.user.adminAccess || !req.user.adminAccess.employee) {
        return res.status(403).json({ message: 'You do not have permission to create employees. Contact Super Admin.' });
      }
    }

    const {
      name,
      email,
      password,
      personalMobile,
      companyMobile,
      referenceMobile,
      personalEmail,
      companyEmail,
      dateOfBirth,
      aadharCard,
      panCard,
      bankDetails,
      joinedThrough,
      additionalNotes,
      access,
      createWithoutAccess = false // New parameter for Super Admin
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Only Super Admin can create employees without access
    if (createWithoutAccess && req.user.role !== 'super-admin') {
      return res.status(403).json({ message: 'Only Super Admin can create employees without access permissions.' });
    }

    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    // Set default access based on role and createWithoutAccess parameter
    let defaultAccess = {
      sales: false,
      operation: false,
      advocate: false,
      leadAdd: false,
      copy: false
    };

    // If Super Admin is creating without access, keep all false
    // If Admin is creating or Super Admin is creating with access, use provided access or defaults
    if (!createWithoutAccess) {
      defaultAccess = access || defaultAccess;
    }

    // Prepare bank details with defaults
    const bankDetailsData = {
      accountNumber: bankDetails?.accountNumber || '',
      ifscCode: bankDetails?.ifscCode || '',
      bankName: bankDetails?.bankName || '',
      accountHolderName: bankDetails?.accountHolderName || '',
      upiId: bankDetails?.upiId || ''
    };

    const employeeData = {
      name,
      email,
      password: hash,
      plainPassword: password,
      personalMobile: personalMobile || '',
      companyMobile: companyMobile || '',
      referenceMobile: referenceMobile || '',
      personalEmail: personalEmail || '',
      companyEmail: companyEmail || '',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      aadharCard: aadharCard || '',
      panCard: panCard || '',
      bankDetails: bankDetailsData,
      joinedThrough: joinedThrough || '',
      additionalNotes: additionalNotes || '',
      access: defaultAccess,
      onboardingStatus: 'completed',
      createdBy: req.user.id, // Use id instead of _id
      createdByModel: 'User', // Since Super Admin is in User model
      createdByRole: req.user.role // Track which role created the employee
    };

    console.log('Creating employee with data:', employeeData);

    const employee = await Employee.create(employeeData);
    
    console.log('Employee created successfully:', employee.employeeId);
    
    res.status(201).json({ 
      message: 'Employee created successfully',
      employeeId: employee.employeeId,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        status: employee.status,
        onboardingStatus: employee.onboardingStatus,
        access: employee.access,
        createdByRole: employee.createdByRole
      }
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: validationErrors
      });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Email already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Employee creation failed', 
      error: error.message
    });
  }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findOne({ employeeId }).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee', error: error.message });
  }
};

// Update employee details
exports.updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updateData = req.body;

    // Handle password update if provided
    if (updateData.password && updateData.password.trim()) {
      const hash = await bcrypt.hash(updateData.password, 10);
      updateData.password = hash;
      updateData.plainPassword = updateData.password;
    } else {
      // Remove password field if not provided or empty
      delete updateData.password;
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.role;
    delete updateData.employeeId;

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee updated successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Employee update failed', error: error.message });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const employee = await Employee.findOneAndDelete({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Employee deletion failed', error: error.message });
  }
};

// Reset employee password
exports.resetEmployeePassword = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { password: hash, plainPassword: newPassword },
      { new: true }
    );
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed', error: error.message });
  }
};

// Update employee status
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, reason } = req.body;

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Require reason when blocking
    if (status === 'blocked' && (!reason || reason.trim() === '')) {
      return res.status(400).json({ message: 'Block reason is mandatory' });
    }

    // Update status and last active time
    employee.status = status;
    employee.lastActiveTime = new Date();
    
    // Handle blocked status
    if (status === 'blocked') {
      employee.isBlocked = true;
      employee.blockedReason = reason.trim();
      employee.blockedAt = new Date();
      employee.blockedBy = req.user.id;
    } else {
      // For any other status (online, offline, on_leave), unblock the employee
      employee.isBlocked = false;
      employee.blockedReason = null;
      employee.blockedAt = null;
      employee.blockedBy = null;
    }

    await employee.save();
    
    // Log the status change
    await employee.logActivity(`Status changed to ${status}`, { 
      previousStatus: employee.status, 
      newStatus: status,
      changedBy: req.user.id 
    });

    // Emit socket event for live update
    const io = req.app.get('io');
    io.emit('employeeStatusUpdate');
    
    res.json({ message: 'Employee status updated successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Status update failed', error: error.message });
  }
};

// Update own status (for employees)
exports.updateOwnStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.id;

    // Find employee by user ID
    const employee = await Employee.findOne({ email: req.user.email });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if employee has active approved leave
    const now = new Date();
    const hasActiveLeave = employee.leaveApplications.some(leave =>
      leave.status === 'approved' &&
      new Date(leave.startDate) <= now &&
      new Date(leave.endDate) >= now
    );

    if (hasActiveLeave) {
      // Don't allow status change, always keep 'on_leave'
      employee.status = 'on_leave';
      employee.lastActiveTime = new Date();
      await employee.save();
      await employee.logActivity('Status remains on_leave due to active leave', {
        previousStatus: employee.status,
        newStatus: 'on_leave',
        changedBy: userId
      });
      const io = req.app.get('io');
      io.emit('employeeStatusUpdate');
      return res.json({ message: 'Status remains on_leave due to active leave', employee });
    }

    // Update status and last active time
    const previousStatus = employee.status;
    employee.status = status;
    employee.lastActiveTime = new Date();
    
    // If going online, unblock if was blocked
    if (status === 'online') {
      employee.isBlocked = false;
      employee.blockedReason = null;
      employee.blockedAt = null;
      employee.blockedBy = null;
    }

    await employee.save();
    
    // Log the status change
    await employee.logActivity(`Status changed to ${status}`, { 
      previousStatus, 
      newStatus: status,
      changedBy: userId 
    });

    // Emit socket event for live update
    const io = req.app.get('io');
    io.emit('employeeStatusUpdate');
    
    res.json({ message: 'Status updated successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Status update failed', error: error.message });
  }
};

// Block employee
exports.blockEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Block reason is mandatory' });
    }
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    await employee.blockEmployee(reason.trim(), req.user.id);
    res.json({ message: 'Employee blocked successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Employee blocking failed', error: error.message });
  }
};

// Unblock employee
exports.unblockEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Unblock reason is mandatory' });
    }
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    await employee.unblockEmployee();
    await employee.logActivity('Employee unblocked', { 
      unblockedBy: req.user.id,
      unblockReason: reason.trim()
    });
    res.json({ message: 'Employee unblocked successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Employee unblocking failed', error: error.message });
  }
};

// Update employee productivity
exports.updateProductivity = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { period, value } = req.body;

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await employee.updateProductivity(period, value);
    
    res.json({ message: 'Productivity updated successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Productivity update failed', error: error.message });
  }
};

// Get employee activity logs
exports.getEmployeeActivityLogs = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const skip = (page - 1) * limit;
    const logs = employee.activityLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + parseInt(limit));

    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(employee.activityLogs.length / limit),
        totalRecords: employee.activityLogs.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
  }
};

// Apply for leave
exports.applyLeave = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Start date, end date, and reason are required' });
    }

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if dates are valid
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Set time to 00:00:00 for date-only comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    if (start < today) {
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }

    // Check for overlapping leave applications
    const overlappingLeave = employee.leaveApplications.find(leave => {
      if (leave.status !== 'pending' && leave.status !== 'approved') {
        return false;
      }
      // Check if the new leave period overlaps with existing leave
      const existingStart = new Date(leave.startDate);
      const existingEnd = new Date(leave.endDate);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      // Relaxed: allow back-to-back leaves
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (overlappingLeave) {
      return res.status(400).json({ message: 'You already have a pending or approved leave application that overlaps with this period' });
    }

    const newLeave = {
      startDate: start,
      endDate: end,
      reason,
      status: 'pending'
    };
    
    console.log('Adding new leave application:', newLeave);
    
    employee.leaveApplications.push(newLeave);

    await employee.save();
    console.log('Employee saved. Total leave applications:', employee.leaveApplications.length);
    
    await employee.logActivity('Leave application submitted', { 
      startDate: start, 
      endDate: end, 
      reason 
    });
    
    res.json({ message: 'Leave application submitted successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Leave application failed', error: error.message });
  }
};

// Get employee's leave applications
exports.getEmployeeLeaves = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log('Getting leaves for employee:', employeeId);
    
    const employee = await Employee.findOne({ employeeId }).select('leaveApplications name employeeId');
    
    if (!employee) {
      console.log('Employee not found:', employeeId);
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('Employee found:', employee.name);
    console.log('Leave applications count:', employee.leaveApplications.length);
    console.log('Leave applications:', employee.leaveApplications);

    // Sort leave applications by creation date (newest first)
    const sortedLeaves = employee.leaveApplications.sort((a, b) => b.createdAt - a.createdAt);

    const response = { 
      leaves: sortedLeaves,
      employeeName: employee.name,
      employeeId: employee.employeeId
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error in getEmployeeLeaves:', error);
    res.status(500).json({ message: 'Failed to fetch leave applications', error: error.message });
  }
};

// Cancel leave application (employee can only cancel pending applications)
exports.cancelLeave = async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;
    
    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const leave = employee.leaveApplications.id(leaveId);
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave application not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending leave applications can be cancelled' });
    }

    // Remove the leave application
    employee.leaveApplications = employee.leaveApplications.filter(l => l._id.toString() !== leaveId);
    
    await employee.save();
    await employee.logActivity('Leave application cancelled', { 
      startDate: leave.startDate, 
      endDate: leave.endDate, 
      reason: leave.reason 
    });
    
    res.json({ message: 'Leave application cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel leave application', error: error.message });
  }
};

// Approve/reject leave application
exports.approveLeave = async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;
    const { status, notes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either approved or rejected' });
    }

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const leave = employee.leaveApplications.id(leaveId);
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave application not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending leave applications can be processed' });
    }

    leave.status = status;
    leave.approvedBy = req.user.id;
    leave.approvedAt = new Date();
    leave.notes = notes;

    if (status === 'approved') {
      employee.status = 'on_leave';
      await employee.logActivity('Leave application approved', { 
        startDate: leave.startDate, 
        endDate: leave.endDate, 
        reason: leave.reason,
        approvedBy: req.user.id,
        notes 
      });
    } else {
      await employee.logActivity('Leave application rejected', { 
        startDate: leave.startDate, 
        endDate: leave.endDate, 
        reason: leave.reason,
        rejectedBy: req.user.id,
        notes 
      });
    }

    await employee.save();
    
    // Send notification to employee about leave response
    const respondedByUser = await User.findById(req.user.id);
    if (respondedByUser) {
      try {
        const notification = await Notification.createLeaveResponseNotification(
          employee._id,
          leave,
          status,
          respondedByUser
        );
        
        // Send real-time notification
        await sendNotificationToUser(employee._id, notification);
        
      } catch (notificationError) {
        console.error('Failed to send leave response notification:', notificationError);
        // Don't fail the leave approval if notification fails
      }
    }
    
    res.json({ message: `Leave application ${status} successfully`, employee });
  } catch (error) {
    res.status(500).json({ message: 'Leave approval failed', error: error.message });
  }
};

// Manual attendance entry
exports.addManualAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date, checkIn, checkOut, status, notes } = req.body;

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.manualAttendance.push({
      date: new Date(date),
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      status,
      notes
    });

    await employee.save();
    
    res.json({ message: 'Attendance added successfully', employee });
  } catch (error) {
    res.status(500).json({ message: 'Attendance addition failed', error: error.message });
  }
};

// Get employee statistics
exports.getEmployeeStats = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { period = 'monthly' } = req.query;

    const employee = await Employee.findOne({ employeeId });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const stats = {
      productivity: employee.productivity[period] || 0,
      onlineTime: employee.onlineTime,
      blockedTime: employee.blockedTime,
      breakTime: employee.breakTime,
      leadsAssigned: employee.leadsAssigned,
      leadsPending: employee.leadsPending,
      leadsClosed: employee.leadsClosed,
      leadsCNP: employee.leadsCNP,
      leadsNotInterested: employee.leadsNotInterested,
      leadsFollowUp: employee.leadsFollowUp,
      paymentCollection: employee.paymentCollection,
      pendingPayment: employee.pendingPayment,
      status: employee.status,
      colorCode: employee.colorCode,
      lastActiveTime: employee.lastActiveTime,
      lastActivity: employee.lastActivity
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee stats', error: error.message });
  }
};

// Update employee access permissions
exports.updateEmployeeAccess = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { access } = req.body;

    console.log('🔍 Access update request:', {
      employeeId,
      access,
      user: req.user.name
    });

    // Get the employee with current access before updating
    const currentEmployee = await Employee.findOne({ employeeId }).select('-password');
    
    if (!currentEmployee) {
      console.log('❌ Employee not found:', employeeId);
      return res.status(404).json({ message: 'Employee not found' });
    }

    console.log('✅ Found employee:', currentEmployee.name);

    // Update the employee access
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { access },
      { new: true, runValidators: true }
    ).select('-password');

    // Send notification to employee about access changes
    const grantedByUser = await User.findById(req.user.id);
    let notificationsSent = 0;
    
    if (grantedByUser) {
      try {
        // Check what access was granted by comparing old and new access
        const oldAccess = currentEmployee.access || {};
        const newAccess = access || {};
        
        console.log('🔍 Access comparison:', {
          oldAccess,
          newAccess,
          grantedBy: grantedByUser.name
        });
        
        // Find what new access was granted
        const accessTypes = ['sales', 'leadAdd', 'leadEdit', 'paymentView', 'paymentClaim', 'reports'];
        const grantedAccess = accessTypes.filter(type => 
          newAccess[type] === true && oldAccess[type] !== true
        );
        
        console.log('🎯 Granted access types:', grantedAccess);
        
        if (grantedAccess.length > 0) {
          for (const accessType of grantedAccess) {
            console.log(`📢 Creating notification for ${accessType} access`);
            
            const notification = await Notification.createAccessGrantedNotification(
              employee._id,
              accessType,
              grantedByUser
            );
            
            console.log('✅ Notification created:', notification._id);
            
            // Send real-time notification
            await sendNotificationToUser(employee._id, notification);
            
            console.log('📡 Real-time notification sent to employee');
            notificationsSent++;
          }
        } else {
          console.log('ℹ️ No new access granted, skipping notification');
        }
      } catch (notificationError) {
        console.error('❌ Failed to send access notification:', notificationError);
        // Don't fail the access update if notification fails
      }
    }

    console.log('✅ Access update completed successfully');
    res.json({ 
      message: 'Employee access updated successfully', 
      employee,
      notificationsSent
    });
  } catch (error) {
    console.error('❌ Access update failed:', error);
    res.status(500).json({ 
      message: 'Access update failed', 
      error: error.message,
      details: 'Check server logs for more information'
    });
  }
};

// Get all employees for lead distribution
exports.getEmployeesForLeadDistribution = async (req, res) => {
  try {
    console.log('getEmployeesForLeadDistribution called by user:', req.user);
    
    const employees = await Employee.find({ 
      isActive: true, 
      status: { $in: ['online', 'offline'] }
      // Removed 'access.sales': true filter to allow distribution to all active employees
    })
    .select('name employeeId status lastActiveTime leadsPending')
    .sort({ leadsPending: 1 });

    console.log(`Found ${employees.length} employees for lead distribution`);
    res.json(employees);
  } catch (error) {
    console.error('Error in getEmployeesForLeadDistribution:', error);
    res.status(500).json({ message: 'Failed to fetch employees for lead distribution', error: error.message });
  }
};

// Get all approval requests (leave, block, login)
exports.getAllApprovals = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can access approvals.' });
    }

    // Get pending leave applications
    const leaveApplications = await Employee.aggregate([
      {
        $unwind: '$leaveApplications'
      },
      {
        $match: {
          'leaveApplications.status': 'pending'
        }
      },
      {
        $project: {
          id: '$leaveApplications._id',
          employeeName: '$name',
          employeeId: '$employeeId',
          reason: '$leaveApplications.reason',
          startDate: '$leaveApplications.startDate',
          endDate: '$leaveApplications.endDate',
          dates: {
            $concat: [
              { $dateToString: { date: '$leaveApplications.startDate', format: '%Y-%m-%d' } },
              ' to ',
              { $dateToString: { date: '$leaveApplications.endDate', format: '%Y-%m-%d' } }
            ]
          },
          requestedAt: '$leaveApplications.createdAt'
        }
      }
    ]);

    // Get pending block requests (employees who are blocked but need approval)
    const blockRequests = await Employee.find({
      status: 'blocked',
      'blockingHistory.status': 'pending'
    }).select('name employeeId blockingHistory');

    const formattedBlockRequests = blockRequests.map(emp => {
      const pendingBlock = emp.blockingHistory.find(block => block.status === 'pending');
      return {
        id: pendingBlock._id,
        employeeName: emp.name,
        employeeId: emp.employeeId,
        reason: pendingBlock.reason,
        requestedAt: pendingBlock.requestedAt
      };
    });

    // Get pending login requests (employees trying to login after office hours)
    const loginRequests = await Employee.find({
      'loginRequests.status': 'pending'
    }).select('name employeeId loginRequests');

    const formattedLoginRequests = loginRequests.map(emp => {
      const pendingLogin = emp.loginRequests.find(req => req.status === 'pending');
      return {
        id: pendingLogin._id,
        employeeName: emp.name,
        employeeId: emp.employeeId,
        reason: pendingLogin.reason,
        requestedAt: pendingLogin.requestedAt
      };
    });

    res.json({
      leaveApplications,
      blockRequests: formattedBlockRequests,
      loginRequests: formattedLoginRequests
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch approvals', error: error.message });
  }
};

// Get all leave applications for admin view
exports.getAllLeaveApplications = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employees = await Employee.find({})
      .populate('approvedBy', 'name')
      .select('name employeeId status leaveApplications');

    const allLeaves = [];

    employees.forEach(emp => {
      emp.leaveApplications.forEach(leave => {
        allLeaves.push({
          id: leave._id,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          status: leave.status,
          appliedAt: leave.createdAt,
          approvedAt: leave.approvedAt,
          approvedBy: leave.approvedBy?.name || null,
          notes: leave.notes
        });
      });
    });

    // Sort by creation date (newest first)
    allLeaves.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    res.json({ leaves: allLeaves });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch leave applications', error: error.message });
  }
};

// Handle approval actions
exports.handleApproval = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can handle approvals.' });
    }

    const { type, id, action, notes } = req.body;

    if (!type || !id || !action) {
      return res.status(400).json({ message: 'Type, ID, and action are required.' });
    }

    let result;

    switch (type) {
      case 'leave':
        result = await handleLeaveApproval(id, action, notes, req.user.id);
        break;
      case 'block':
        result = await handleBlockApproval(id, action, notes, req.user.id);
        break;
      case 'login':
        result = await handleLoginApproval(id, action, notes, req.user.id);
        break;
      default:
        return res.status(400).json({ message: 'Invalid approval type.' });
    }

    res.json({ message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`, result });
  } catch (error) {
    res.status(500).json({ message: 'Approval action failed', error: error.message });
  }
};

// Helper function for leave approval
async function handleLeaveApproval(leaveId, action, notes, adminId) {
  const employee = await Employee.findOne({
    'leaveApplications._id': leaveId
  });

  if (!employee) {
    throw new Error('Leave application not found');
  }

  const leave = employee.leaveApplications.id(leaveId);
  leave.status = action === 'approve' ? 'approved' : 'rejected';
  leave.approvedBy = adminId;
  leave.approvedAt = new Date();
  leave.notes = notes;

  if (action === 'approve') {
    employee.status = 'on_leave';
  }

  await employee.save();
  return { employeeId: employee.employeeId, leaveId };
}

// Helper function for block approval
async function handleBlockApproval(blockId, action, notes, adminId) {
  const employee = await Employee.findOne({
    'blockingHistory._id': blockId
  });

  if (!employee) {
    throw new Error('Block request not found');
  }

  const block = employee.blockingHistory.id(blockId);
  block.status = action === 'approve' ? 'approved' : 'rejected';
  block.approvedBy = adminId;
  block.approvedAt = new Date();
  block.notes = notes;

  if (action === 'reject') {
    employee.status = 'online';
    employee.isBlocked = false;
  }

  await employee.save();
  return { employeeId: employee.employeeId, blockId };
}

// Helper function for login approval
async function handleLoginApproval(loginId, action, notes, adminId) {
  const employee = await Employee.findOne({
    'loginRequests._id': loginId
  });

  if (!employee) {
    throw new Error('Login request not found');
  }

  const login = employee.loginRequests.id(loginId);
  login.status = action === 'approve' ? 'approved' : 'rejected';
  login.approvedBy = adminId;
  login.approvedAt = new Date();
  login.notes = notes;

  await employee.save();
  return { employeeId: employee.employeeId, loginId };
}

// Self block employee (for inactivity)
exports.selfBlockEmployee = async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const reason = req.body.reason || 'Inactivity for 10 minutes';

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID not found in token' });
    }

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.isBlocked) {
      return res.status(400).json({ message: 'Employee already blocked' });
    }

    await employee.blockEmployee(reason, employee._id); // Blocked by self
    res.json({ message: 'Employee blocked due to inactivity', employee });
  } catch (error) {
    res.status(500).json({ message: 'Self block failed', error: error.message });
  }
}; 

exports.getAssignedSheets = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const assignedLeads = await Lead.find({ assignedTo: employeeId });
    res.json({ success: true, data: assignedLeads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
}; 