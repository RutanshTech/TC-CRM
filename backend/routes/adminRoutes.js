const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddleware');
const { 
  getAllAdmins, 
  createAdmin, 
  updateAdmin, 
  deleteAdmin, 
  getAdminById, 
  resetAdminPassword,
  updateAdminPermissions,
  getAdminPermissions
} = require('../controllers/authController');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// --- ADVOCATE ROUTES ABSOLUTELY FIRST ---
// For admin/super-admin (CreateAdvocate table)
router.get('/advocates', authMiddleware, roleMiddleware(['admin', 'super-admin']), async (req, res) => {
  console.log('DEBUG: GET /api/advocates (admin/super-admin) route hit by', req.user);
  try {
    const { search = '', status = 'all' } = req.query;
    const query = { role: 'advocate' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'active') query.isBlocked = false;
    if (status === 'blocked') query.isBlocked = true;
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching advocates', error: err.message });
  }
});

// For operation users (lead assignment)
router.get('/advocates/for-operation', authMiddleware, roleMiddleware(['operation']), async (req, res) => {
  console.log('DEBUG: GET /api/advocates/for-operation (operation) route hit by', req.user);
  try {
    const { search = '', status = 'all' } = req.query;
    const query = { role: 'advocate' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'active') query.isBlocked = false;
    if (status === 'blocked') query.isBlocked = true;
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching advocates', error: err.message });
  }
});

// Create advocate
router.post('/advocates', authMiddleware, roleMiddleware(['admin', 'super-admin']), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'All fields required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name, 
      email, 
      password: hash, 
      role: 'advocate', 
      plainPassword: password,
      status: 'offline',
      lastActiveTime: new Date()
    });
    res.status(201).json({ message: 'Advocate created', user });
  } catch (err) {
    res.status(500).json({ message: 'Error creating advocate', error: err.message });
  }
});

// Update advocate
router.put('/advocates/:id', authMiddleware, roleMiddleware(['admin', 'super-admin']), async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email }, { new: true });
    res.json({ message: 'Advocate updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating advocate', error: err.message });
  }
});

// Block advocate
router.patch('/advocates/:id/block', authMiddleware, roleMiddleware(['admin', 'super-admin']), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true, blockedReason: reason }, { new: true });
    res.json({ message: 'Advocate blocked', user });
  } catch (err) {
    res.status(500).json({ message: 'Error blocking advocate', error: err.message });
  }
});

// Reset advocate password
router.patch('/advocates/:id/reset-password', authMiddleware, roleMiddleware(['admin', 'super-admin']), async (req, res) => {
  try {
    const { password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { password: hash, plainPassword: password }, { new: true });
    res.json({ message: 'Password reset', user });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password', error: err.message });
  }
});

// Delete advocate
router.delete('/advocates/:id', authMiddleware, roleMiddleware(['admin', 'super-admin']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Advocate deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting advocate', error: err.message });
  }
});

// Update advocate status (for login/logout)
router.patch('/advocates/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { 
        status, 
        lastActiveTime: new Date() 
      }, 
      { new: true }
    );
    res.json({ message: 'Status updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});

// --- ADMIN ROUTE BAAD ME ---
router.get('/admin/:adminId', authMiddleware, roleMiddleware(['super-admin']), (req, res) => {
  console.log('DEBUG: GET /api/admin/:adminId route hit by', req.user);
  res.json({ message: 'Admin route working!' });
});

// List all admins with onboarding details
router.get('/adminsget', authMiddleware, roleMiddleware(['super-admin']), getAllAdmins);

// Get specific admin by ID
// router.get('/admin/:adminId', authMiddleware, roleMiddleware(['super-admin']), getAdminById);

// Create new admin with comprehensive onboarding
// router.post('/adminsadd', authMiddleware, roleMiddleware(['super-admin']), createAdmin);

// Update admin details
// router.put('/admin/:adminId', authMiddleware, roleMiddleware(['super-admin']), updateAdmin);

// Reset admin password
// router.patch('/admin/:adminId/reset-password', authMiddleware, roleMiddleware(['super-admin']), resetAdminPassword);

// Delete admin
// router.delete('/admin/:adminId', authMiddleware, roleMiddleware(['super-admin']), deleteAdmin);

// Get admin permissions
// router.get('/admin/:adminId/permissions', authMiddleware, roleMiddleware(['super-admin']), getAdminPermissions);

// Update admin permissions
// router.patch('/admin/:adminId/permissions', authMiddleware, roleMiddleware(['super-admin']), updateAdminPermissions);

// At the very end, add a catch-all for debugging
router.use((req, res, next) => {
  console.log('DEBUG: Unmatched route:', req.method, req.originalUrl);
  next();
});

module.exports = router; 