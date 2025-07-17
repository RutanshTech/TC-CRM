const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  getAllOperations,
  createOperation,
  getOperationById,
  updateOperation,
  deleteOperation,
  resetOperationPassword,
  blockOperation,
  unblockOperation,
  getOperationActivityLogs,
  updateOperationStatus,
  getAllOperationsBasic
} = require('../controllers/operationController');

// Get all operations with filters and pagination
router.get('/operations', authMiddleware, roleMiddleware(['admin', 'super-admin']), getAllOperations);

// Create new operation
router.post('/operations', authMiddleware, roleMiddleware(['admin', 'super-admin']), createOperation);

// Get specific operation by ID (operations can access their own data)
router.get('/operations/:operationId', authMiddleware, getOperationById);

// Update operation details (operations can update their own data)
router.put('/operations/:operationId', authMiddleware, updateOperation);

// Delete operation
router.delete('/operations/:operationId', authMiddleware, roleMiddleware(['admin', 'super-admin']), deleteOperation);

// Reset operation password
router.patch('/operations/:operationId/reset-password', authMiddleware, roleMiddleware(['admin', 'super-admin']), resetOperationPassword);

// Block operation
router.post('/operations/:operationId/block', authMiddleware, roleMiddleware(['admin', 'super-admin']), blockOperation);

// Unblock operation
router.post('/operations/:operationId/unblock', authMiddleware, roleMiddleware(['admin', 'super-admin']), unblockOperation);

// Get operation activity logs
router.get('/operations/:operationId/activity-logs', authMiddleware, roleMiddleware(['admin', 'super-admin']), getOperationActivityLogs);

// Update operation status (operations can update their own status)
router.patch('/operations/:operationId/status', authMiddleware, updateOperationStatus);

// Public: Get all Operations users (basic info only)
router.get('/operations-basic', getAllOperationsBasic);

module.exports = router; 