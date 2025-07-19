// Auth Controller
const User = require('../models/User');
const Employee = require('../models/Employee');
const Operation = require('../models/Operation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { generateToken } = require('../middlewares/authMiddleware');
const Notification = require('../models/Notification');
dotenv.config();

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hash, role, plainPassword: password });
    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate that role is provided
    if (!role) {
      return res.status(400).json({ message: 'Role selection is required' });
    }

    let user = null;
    let userType = null;

    // Check in User model for admin, super-admin, and advocate
    if (role === 'admin' || role === 'super-admin' || role === 'advocate') {
      user = await User.findOne({ email });
      userType = (role === 'advocate') ? 'advocate' : 'user';
    }
    // Check in Employee model for employee
    else if (role === 'employee') {
      user = await Employee.findOne({ email });
      userType = 'employee';
    }
    // Check in Operation model for operation
    else if (role === 'operation') {
      user = await Operation.findOne({ email });
      userType = 'operation';
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    // Validate that the selected role matches the user's actual role
    if (user.role !== role) {
      return res.status(401).json({ message: `Invalid role selection. This account is registered as ${user.role}` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = generateToken(user);
    
    // Prepare user data based on type
    let userData = {
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email
    };

    // Add type-specific fields
    if (userType === 'user') {
      userData.adminAccess = user.adminAccess || null;
      userData.adminId = user.adminId;
    } else if (userType === 'employee') {
      userData.employeeId = user.employeeId;
      userData.access = user.access || null;
      userData.status = user.status;
    } else if (userType === 'operation') {
      userData.status = user.status;
      userData.isBlocked = user.isBlocked;
    }

    res.json({ 
      token, 
      user: userData,
      userType
    });

  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
};

// Employee Login (separate endpoint for employee-specific login)
exports.employeeLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const employee = await Employee.findOne({ email });
    if (!employee || !employee.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    // Check if employee is blocked
    if (employee.isBlocked) {
      return res.status(401).json({ 
        message: 'Account is blocked', 
        reason: employee.blockedReason 
      });
    }

    const match = await bcrypt.compare(password, employee.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = generateToken(employee);
    
    res.json({ 
      token, 
      user: { 
        id: employee._id, 
        name: employee.name, 
        role: employee.role,
        email: employee.email,
        employeeId: employee.employeeId,
        access: employee.access || null,
        status: employee.status
      },
      userType: 'employee'
    });

  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
};

// Operation Login (separate endpoint for operation-specific login)
exports.operationLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const operation = await Operation.findOne({ email });
    if (!operation || !operation.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    // Check if operation is blocked
    if (operation.isBlocked) {
      return res.status(401).json({ 
        message: 'Account is blocked', 
        reason: operation.blockedReason 
      });
    }

    const match = await bcrypt.compare(password, operation.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    const token = generateToken(operation);
    
    res.json({ 
      token, 
      user: { 
        id: operation._id, 
        name: operation.name, 
        role: operation.role,
        email: operation.email,
        status: operation.status,
        isBlocked: operation.isBlocked
      },
      userType: 'operation'
    });

  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
};

// Get all registered users (excluding passwords)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error });
  }
};

// Get all admins with onboarding details
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admins', error });
  }
};

// Create a new admin with comprehensive onboarding details
exports.createAdmin = async (req, res) => {
  try {
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
      adminAccess
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);

    const adminData = {
      name,
      email,
      password: hash,
      role: 'admin',
      plainPassword: password,
      personalMobile,
      companyMobile,
      referenceMobile,
      personalEmail,
      companyEmail,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      aadharCard,
      panCard,
      bankDetails,
      joinedThrough,
      additionalNotes,
      adminAccess: adminAccess || {
        employee: false,
        sales: false,
        operation: false,
        advocate: false,
        allThings: false
      },
      onboardingStatus: 'completed'
    };

    const user = await User.create(adminData);
    res.status(201).json({ 
      message: 'Admin created successfully',
      adminId: user.adminId
    });
  } catch (error) {
    res.status(500).json({ message: 'Admin creation failed', error });
  }
};

// Update admin details
exports.updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.role;
    delete updateData.adminId;

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const admin = await User.findOneAndUpdate(
      { adminId, role: 'admin' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ message: 'Admin updated successfully', admin });
  } catch (error) {
    res.status(500).json({ message: 'Admin update failed', error });
  }
};

// Reset admin password
exports.resetAdminPassword = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    
    const admin = await User.findOneAndUpdate(
      { adminId, role: 'admin' },
      { password: hash, plainPassword: newPassword },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Send notification to admin about password change
    const changedByUser = await User.findById(req.user.id);
    if (changedByUser) {
      try {
        await Notification.createAdminPasswordChangedNotification(
          admin._id,
          changedByUser
        );
      } catch (notificationError) {
        console.error('Failed to send password change notification:', notificationError);
        // Don't fail the password reset if notification fails
      }
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Password reset failed', error });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findOneAndDelete({ adminId, role: 'admin' });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Admin deletion failed', error });
  }
};

// Get admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findOne({ adminId, role: 'admin' }).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin', error });
  }
};

// Get all employees (role: employee)
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employees', error });
  }
};

// Create a new employee (super-admin only)
exports.createEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role: 'employee', plainPassword: password });
    res.status(201).json({ message: 'Employee created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Employee creation failed', error });
  }
};

// Update admin permissions (super-admin only)
exports.updateAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { adminAccess } = req.body;

    if (!adminAccess) {
      return res.status(400).json({ message: 'Admin access permissions are required' });
    }

    // Get the current admin to compare access changes
    const currentAdmin = await User.findOne({ adminId, role: 'admin' });
    if (!currentAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const admin = await User.findOneAndUpdate(
      { adminId, role: 'admin' },
      { adminAccess },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Send notification to admin about access changes
    const grantedByUser = await User.findById(req.user.id);
    if (grantedByUser) {
      try {
        // Check what new access was granted
        const oldAccess = currentAdmin.adminAccess || {};
        const newAccess = adminAccess || {};
        
        // Find what new access was granted
        const accessTypes = ['employee', 'sales', 'operation', 'advocate', 'allThings'];
        const grantedAccess = accessTypes.filter(type => 
          newAccess[type] === true && oldAccess[type] !== true
        );
        
        if (grantedAccess.length > 0) {
          for (const accessType of grantedAccess) {
            await Notification.createAdminAccessGrantedNotification(
              admin._id,
              accessType,
              grantedByUser
            );
          }
        }
      } catch (notificationError) {
        console.error('Failed to send admin access notification:', notificationError);
        // Don't fail the access update if notification fails
      }
    }

    res.json({ 
      message: 'Admin permissions updated successfully', 
      admin 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update admin permissions', error });
  }
};

// Get admin permissions (super-admin only)
exports.getAdminPermissions = async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await User.findOne({ adminId, role: 'admin' })
      .select('adminId name email adminAccess onboardingStatus');

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin permissions', error });
  }
};
