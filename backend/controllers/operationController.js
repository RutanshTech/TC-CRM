const Operation = require('../models/Operation');
const User = require('../models/User');

// Get all operations with filters and pagination
const getAllOperations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { salesPersonName: { $regex: search, $options: 'i' } },
        { salesPersonId: { $regex: search, $options: 'i' } },
        { fillingText: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      filter.status = status;
    }

    // Get operations with pagination
    const operations = await Operation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('blockedBy', 'name email');

    // Get total count for pagination
    const total = await Operation.countDocuments(filter);

    res.json({
      operations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching operations:', error);
    res.status(500).json({ message: 'Error fetching operations', error: error.message });
  }
};

// Create new operation
const createOperation = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password,
      notifications,
      receivedForDrafting,
      paymentReceiptReceived,
      requestForFilling,
      clientUpdation,
      leads,
      completeLead,
      dataUpdationNotify,
      chat,
      leadEditOption,
      upload,
      draft,
      poa,
      ua,
      salesPersonName,
      salesPersonId,
      fillingText,
      clients,
      afterPaymentMarkDoneLeadsMoveToClients,
      leadTransferToAdvocate,
      log
    } = req.body;
    const user = req.user;

    // Check if operation with email already exists
    const existingOperation = await Operation.findOne({ email });
    if (existingOperation) {
      return res.status(400).json({ message: 'Operation with this email already exists' });
    }

    // Create new operation
    const operation = new Operation({
      name,
      email,
      password,
      plainPassword: password, // Store plain password for demo
      notifications: notifications || false,
      receivedForDrafting: receivedForDrafting || false,
      paymentReceiptReceived: paymentReceiptReceived || false,
      requestForFilling: requestForFilling || false,
      clientUpdation: clientUpdation || false,
      leads: leads || false,
      completeLead: completeLead || false,
      dataUpdationNotify: dataUpdationNotify || false,
      chat: chat || false,
      leadEditOption: leadEditOption || false,
      upload: upload || false,
      draft: draft || false,
      poa: poa || false,
      ua: ua || false,
      salesPersonName: salesPersonName || '',
      salesPersonId: salesPersonId || '',
      fillingText: fillingText || '',
      clients: clients || false,
      afterPaymentMarkDoneLeadsMoveToClients: afterPaymentMarkDoneLeadsMoveToClients || false,
      leadTransferToAdvocate: leadTransferToAdvocate || false,
      log: log || { who: '', what: '', when: new Date(), where: '' },
      createdBy: user._id,
      createdByModel: user.role === 'employee' ? 'Employee' : 'User',
      createdByRole: user.role
    });

    await operation.save();

    // Log activity
    await operation.logActivity('Operation created', {
      createdBy: user.name,
      createdByRole: user.role
    });

    res.status(201).json({
      message: 'Operation created successfully',
      operation: {
        _id: operation._id,
        name: operation.name,
        email: operation.email,
        role: operation.role,
        status: operation.status,
        isActive: operation.isActive,
        createdAt: operation.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating operation:', error);
    res.status(500).json({ message: 'Error creating operation', error: error.message });
  }
};

// Get operation by ID
const getOperationById = async (req, res) => {
  try {
    const { operationId } = req.params;
    const user = req.user;

    // Check if operation is accessing their own data or if user is admin
    if (user.role === 'operation' && user.id !== operationId) {
      return res.status(403).json({ message: 'You can only access your own data' });
    }

    const operation = await Operation.findById(operationId)
      .populate('createdBy', 'name email')
      .populate('blockedBy', 'name email');

    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    res.json(operation);
  } catch (error) {
    console.error('Error fetching operation:', error);
    res.status(500).json({ message: 'Error fetching operation', error: error.message });
  }
};

// Update operation
const updateOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { 
      name, 
      email,
      notifications,
      receivedForDrafting,
      paymentReceiptReceived,
      requestForFilling,
      clientUpdation,
      leads,
      completeLead,
      dataUpdationNotify,
      chat,
      leadEditOption,
      upload,
      draft,
      poa,
      ua,
      salesPersonName,
      salesPersonId,
      fillingText,
      clients,
      afterPaymentMarkDoneLeadsMoveToClients,
      leadTransferToAdvocate,
      log
    } = req.body;
    const user = req.user;

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    // Check if operation is updating their own data or if user is admin
    if (user.role === 'operation' && user.id !== operationId) {
      return res.status(403).json({ message: 'You can only update your own data' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== operation.email) {
      const existingOperation = await Operation.findOne({ email });
      if (existingOperation) {
        return res.status(400).json({ message: 'Operation with this email already exists' });
      }
    }

    // Update operation fields
    if (name !== undefined) operation.name = name;
    if (email !== undefined) operation.email = email;
    if (notifications !== undefined) operation.notifications = notifications;
    if (receivedForDrafting !== undefined) operation.receivedForDrafting = receivedForDrafting;
    if (paymentReceiptReceived !== undefined) operation.paymentReceiptReceived = paymentReceiptReceived;
    if (requestForFilling !== undefined) operation.requestForFilling = requestForFilling;
    if (clientUpdation !== undefined) operation.clientUpdation = clientUpdation;
    if (leads !== undefined) operation.leads = leads;
    if (completeLead !== undefined) operation.completeLead = completeLead;
    if (dataUpdationNotify !== undefined) operation.dataUpdationNotify = dataUpdationNotify;
    if (chat !== undefined) operation.chat = chat;
    if (leadEditOption !== undefined) operation.leadEditOption = leadEditOption;
    if (upload !== undefined) operation.upload = upload;
    if (draft !== undefined) operation.draft = draft;
    if (poa !== undefined) operation.poa = poa;
    if (ua !== undefined) operation.ua = ua;
    if (salesPersonName !== undefined) operation.salesPersonName = salesPersonName;
    if (salesPersonId !== undefined) operation.salesPersonId = salesPersonId;
    if (fillingText !== undefined) operation.fillingText = fillingText;
    if (clients !== undefined) operation.clients = clients;
    if (afterPaymentMarkDoneLeadsMoveToClients !== undefined) operation.afterPaymentMarkDoneLeadsMoveToClients = afterPaymentMarkDoneLeadsMoveToClients;
    if (leadTransferToAdvocate !== undefined) operation.leadTransferToAdvocate = leadTransferToAdvocate;
    if (log !== undefined) operation.log = log;

    await operation.save();

    // Log activity
    await operation.logActivity('Operation updated', {
      updatedBy: user.name,
      updatedByRole: user.role,
      updatedFields: Object.keys(req.body)
    });

    res.json({
      message: 'Operation updated successfully',
      operation: {
        _id: operation._id,
        name: operation.name,
        email: operation.email,
        role: operation.role,
        status: operation.status,
        isActive: operation.isActive,
        updatedAt: operation.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating operation:', error);
    res.status(500).json({ message: 'Error updating operation', error: error.message });
  }
};

// Delete operation
const deleteOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const user = req.user;

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    // Log activity before deletion
    await operation.logActivity('Operation deleted', {
      deletedBy: user.name,
      deletedByRole: user.role
    });

    await Operation.findByIdAndDelete(operationId);

    res.json({ message: 'Operation deleted successfully' });
  } catch (error) {
    console.error('Error deleting operation:', error);
    res.status(500).json({ message: 'Error deleting operation', error: error.message });
  }
};

// Reset operation password
const resetOperationPassword = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { newPassword } = req.body;
    const user = req.user;

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    // Update password
    operation.password = newPassword;
    operation.plainPassword = newPassword; // Store plain password for demo
    await operation.save();

    // Log activity
    await operation.logActivity('Password reset', {
      resetBy: user.name,
      resetByRole: user.role
    });

    res.json({
      message: 'Operation password reset successfully',
      operation: {
        _id: operation._id,
        name: operation.name,
        email: operation.email,
        plainPassword: operation.plainPassword
      }
    });
  } catch (error) {
    console.error('Error resetting operation password:', error);
    res.status(500).json({ message: 'Error resetting operation password', error: error.message });
  }
};

// Block operation
const blockOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { reason } = req.body;
    const user = req.user;

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    if (operation.isBlocked) {
      return res.status(400).json({ message: 'Operation is already blocked' });
    }

    await operation.blockOperation(reason, user._id);

    // Log activity
    await operation.logActivity('Operation blocked', {
      blockedBy: user.name,
      blockedByRole: user.role,
      reason
    });

    res.json({
      message: 'Operation blocked successfully',
      operation: {
        _id: operation._id,
        name: operation.name,
        email: operation.email,
        status: operation.status,
        isBlocked: operation.isBlocked,
        blockedReason: operation.blockedReason,
        blockedAt: operation.blockedAt
      }
    });
  } catch (error) {
    console.error('Error blocking operation:', error);
    res.status(500).json({ message: 'Error blocking operation', error: error.message });
  }
};

// Unblock operation
const unblockOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const user = req.user;

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    if (!operation.isBlocked) {
      return res.status(400).json({ message: 'Operation is not blocked' });
    }

    await operation.unblockOperation();

    // Log activity
    await operation.logActivity('Operation unblocked', {
      unblockedBy: user.name,
      unblockedByRole: user.role
    });

    res.json({
      message: 'Operation unblocked successfully',
      operation: {
        _id: operation._id,
        name: operation.name,
        email: operation.email,
        status: operation.status,
        isBlocked: operation.isBlocked
      }
    });
  } catch (error) {
    console.error('Error unblocking operation:', error);
    res.status(500).json({ message: 'Error unblocking operation', error: error.message });
  }
};

// Get operation activity logs
const getOperationActivityLogs = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    const logs = operation.activityLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + parseInt(limit));

    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(operation.activityLogs.length / limit),
        totalRecords: operation.activityLogs.length
      }
    });
  } catch (error) {
    console.error('Error fetching operation activity logs:', error);
    res.status(500).json({ message: 'Error fetching operation activity logs', error: error.message });
  }
};

// Update operation status (for operations to update their own status)
const updateOperationStatus = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { status } = req.body;
    const user = req.user;

    // Check if the operation is updating their own status
    if (user.role === 'operation' && user.id !== operationId) {
      return res.status(403).json({ message: 'You can only update your own status' });
    }

    const operation = await Operation.findById(operationId);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    // Update status
    operation.status = status;
    operation.lastActiveTime = new Date();
    await operation.save();

    // Log activity
    await operation.logActivity('Status updated', {
      updatedBy: user.name,
      updatedByRole: user.role,
      newStatus: status
    });

    res.json({
      message: 'Operation status updated successfully',
      operation: {
        _id: operation._id,
        name: operation.name,
        email: operation.email,
        status: operation.status,
        lastActiveTime: operation.lastActiveTime
      }
    });
  } catch (error) {
    console.error('Error updating operation status:', error);
    res.status(500).json({ message: 'Error updating operation status', error: error.message });
  }
};

// Public: Get all Operations users (basic info only)
const getAllOperationsBasic = async (req, res) => {
  try {
    const operations = await Operation.find({ role: 'operation', isActive: true }, '_id name email status isActive');
    res.json({ operations });
  } catch (error) {
    console.error('Error fetching operations (basic):', error);
    res.status(500).json({ message: 'Error fetching operations', error: error.message });
  }
};

module.exports = {
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
}; 