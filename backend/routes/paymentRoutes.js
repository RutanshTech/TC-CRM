const express = require('express');
const router = express.Router();
const { authMiddleware, employeeAccessMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const {
  createPaymentEntry,
  getAllPayments,
  getPaymentById,
  claimPayment,
  verifyPayment,
  getPaymentStats,
  getPaymentsByEmployee,
  getMyClaimedPayments,
  updatePayment,
  deletePayment,
  getPaymentEntries,
  claimPaymentWithLead,
  getAvailablePayments
} = require('../controllers/paymentController');

// Payment Collection Routes
// Create payment entry
router.post('/payments', authMiddleware, roleMiddleware(['admin', 'super-admin']), createPaymentEntry);

// Get all payments with filters
router.get('/payments', authMiddleware, roleMiddleware(['admin', 'super-admin']), getAllPayments);

// Get payment statistics
router.get('/payments/stats', authMiddleware, roleMiddleware(['admin', 'super-admin']), getPaymentStats);

// Get payments by employee
router.get('/payments/employee/:employeeId', authMiddleware, roleMiddleware(['admin', 'super-admin']), getPaymentsByEmployee);

// Get available payments for employees
router.get('/payments/available', authMiddleware, getAvailablePayments);

// Get payment entries for frontend
router.get('/entries', authMiddleware, roleMiddleware(['admin', 'super-admin']), getPaymentEntries);

// Get payment by ID
router.get('/payments/:paymentId', authMiddleware, roleMiddleware(['admin', 'super-admin']), getPaymentById);

// Claim payment
router.post('/payments/:paymentId/claim', authMiddleware, claimPayment);

// Claim payment with lead ID
router.post('/payments/:paymentId/claim-with-lead', authMiddleware, claimPaymentWithLead);

// Verify payment
router.patch('/payments/:paymentId/verify', authMiddleware, roleMiddleware(['admin', 'super-admin']), verifyPayment);

// Update payment
router.put('/payments/:paymentId', authMiddleware, roleMiddleware(['admin', 'super-admin']), updatePayment);

// Delete payment
router.delete('/payments/:paymentId', authMiddleware, roleMiddleware(['admin', 'super-admin']), deletePayment);

module.exports = router; 