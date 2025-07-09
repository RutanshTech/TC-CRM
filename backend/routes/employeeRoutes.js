const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getAllEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  resetEmployeePassword,
  updateEmployeeStatus,
  blockEmployee,
  unblockEmployee,
  updateProductivity,
  getEmployeeActivityLogs,
  applyLeave,
  getEmployeeLeaves,
  cancelLeave,
  approveLeave,
  addManualAttendance,
  getEmployeeStats,
  updateEmployeeAccess,
  getEmployeesForLeadDistribution,
  getAllApprovals,
  getAllLeaveApplications,
  handleApproval,
  updateOwnStatus,
  selfBlockEmployee
} = require('../controllers/employeeController');

// Employee Management Routes
// Get all employees with filters and pagination
router.get('/employees', authMiddleware, roleMiddleware(['admin', 'super-admin']), getAllEmployees);

// Get employees for lead distribution (MUST be before /employees/:employeeId)
router.get('/employees/lead-distribution', authMiddleware, roleMiddleware(['admin', 'super-admin']), getEmployeesForLeadDistribution);

// Create new employee with comprehensive onboarding
router.post('/employees', authMiddleware, roleMiddleware(['admin', 'super-admin']), createEmployee);

// Get specific employee by ID
router.get('/employees/:employeeId', authMiddleware, roleMiddleware(['admin', 'super-admin']), getEmployeeById);

// Update employee details
router.put('/employees/:employeeId', authMiddleware, roleMiddleware(['admin', 'super-admin']), updateEmployee);

// Delete employee
router.delete('/employees/:employeeId', authMiddleware, roleMiddleware(['admin', 'super-admin']), deleteEmployee);

// Reset employee password
router.patch('/employees/:employeeId/reset-password', authMiddleware, roleMiddleware(['admin', 'super-admin']), resetEmployeePassword);

// Update employee status (admin/super-admin only)
router.patch('/employees/:employeeId/status', authMiddleware, roleMiddleware(['admin', 'super-admin']), updateEmployeeStatus);

// Update own status (for employees)
router.patch('/employees/status', (req, res, next) => {
  console.log('PATCH /api/employees/status hit');
  next();
}, authMiddleware, updateOwnStatus);

// Block employee
router.post('/employees/:employeeId/block', authMiddleware, roleMiddleware(['admin', 'super-admin']), blockEmployee);

// Self block (for inactivity)
router.post('/employees/self-block', authMiddleware, selfBlockEmployee);

// Unblock employee
router.post('/employees/:employeeId/unblock', authMiddleware, roleMiddleware(['admin', 'super-admin']), unblockEmployee);

// Update employee productivity
router.patch('/employees/:employeeId/productivity', authMiddleware, roleMiddleware(['admin', 'super-admin']), updateProductivity);

// Get employee activity logs
router.get('/employees/:employeeId/activity-logs', authMiddleware, roleMiddleware(['admin', 'super-admin']), getEmployeeActivityLogs);

// Leave Management
// Apply for leave
router.post('/employees/:employeeId/leave', authMiddleware, applyLeave);

// Get employee's leave applications
router.get('/employees/:employeeId/leaves', authMiddleware, getEmployeeLeaves);

// Cancel leave application (employee can only cancel pending ones)
router.delete('/employees/:employeeId/leave/:leaveId', authMiddleware, cancelLeave);

// Approve/reject leave application
router.patch('/employees/:employeeId/leave/:leaveId', authMiddleware, roleMiddleware(['admin', 'super-admin']), approveLeave);

// Get all leave applications (admin only)
router.get('/employees/leaves/all', authMiddleware, roleMiddleware(['admin', 'super-admin']), getAllLeaveApplications);

// Manual attendance entry
router.post('/employees/:employeeId/attendance', authMiddleware, roleMiddleware(['admin', 'super-admin']), addManualAttendance);

// Get employee statistics
router.get('/employees/:employeeId/stats', authMiddleware, roleMiddleware(['admin', 'super-admin']), getEmployeeStats);

// Update employee access permissions
router.patch('/employees/:employeeId/access', authMiddleware, roleMiddleware(['admin', 'super-admin']), updateEmployeeAccess);

// Approval Routes
// Get all approval requests
router.get('/approvals', authMiddleware, roleMiddleware(['admin', 'super-admin']), getAllApprovals);

// Handle approval actions
router.patch('/approvals', authMiddleware, roleMiddleware(['admin', 'super-admin']), handleApproval);

module.exports = router; 