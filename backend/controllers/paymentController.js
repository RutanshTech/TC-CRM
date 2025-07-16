const PaymentCollection = require('../models/PaymentCollection');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { broadcastNotification } = require('./notificationController');

// Create payment entry
exports.createPaymentEntry = async (req, res) => {
  try {
    const {
      amount,
      paymentMethod,
      leadId,
      leadPhoneNumber,
      leadCompanyName,
      leadNotes,
      description,
      receiptNumber,
      transactionId,
      dueDate
    } = req.body;

    const paymentData = {
      amount,
      paymentMethod,
      leadId,
      leadPhoneNumber,
      leadCompanyName,
      leadNotes,
      description,
      receiptNumber,
      transactionId,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id
    };

    const payment = await PaymentCollection.create(paymentData);

    // Get all employees with sales access for notification
    const salesEmployees = await Employee.find({ 
      'access.sales': true, 
      isActive: true 
    }).select('_id name employeeId');

    // Create notification for payment claim
    if (salesEmployees.length > 0) {
      await Notification.createPaymentClaimNotification(payment, salesEmployees.map(emp => emp._id));
      
      // Update payment with notification sent
      await payment.sendNotification(salesEmployees.map(emp => emp._id));
    }

    // Send notification to all employees about payment creation
    const allEmployees = await Employee.find({ isActive: true }).select('_id name employeeId');
    const createdByUser = await User.findById(req.user.id);
    
    if (allEmployees.length > 0 && createdByUser) {
      try {
        // Send notification to all employees about the payment creation
        const notificationPromises = allEmployees.map(async (employee) => {
          const notification = await Notification.createPaymentCreatedNotification(
            payment,
            employee._id,
            createdByUser
          );
          return notification;
        });
        
        const notifications = await Promise.all(notificationPromises);
        
        // Send real-time notifications to all employees
        const employeeIds = allEmployees.map(emp => emp._id);
        await broadcastNotification(employeeIds, notifications[0]); // Send first notification as template
        
      } catch (notificationError) {
        console.error('Failed to send payment creation notifications:', notificationError);
        // Don't fail the payment creation if notification fails
      }
    }

    res.status(201).json({ 
      message: 'Payment entry created successfully',
      payment,
      notifiedEmployees: salesEmployees.length,
      totalNotifications: allEmployees.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment creation failed', error: error.message });
  }
};

// Get all payment entries with filters
exports.getAllPayments = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10, startDate, endDate } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { leadId: { $regex: search, $options: 'i' } },
        { leadPhoneNumber: { $regex: search, $options: 'i' } },
        { leadCompanyName: { $regex: search, $options: 'i' } },
        { employeeName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date range filter
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const payments = await PaymentCollection.find(query)
      .populate('collectedBy', 'name employeeId')
      .populate('claimedBy', 'name employeeId')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaymentCollection.countDocuments(query);
    
    res.json({
      payments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await PaymentCollection.findById(paymentId)
      .populate('collectedBy', 'name employeeId')
      .populate('claimedBy', 'name employeeId')
      .populate('verifiedBy', 'name')
      .populate('notifiedEmployees', 'name employeeId')
      .select('amount claimedAmount paymentMethod status claimedBy collectedBy verifiedBy notifiedEmployees createdAt claimedAt leadId description accountName receiptNumber transactionId');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment', error: error.message });
  }
};

// Claim payment
exports.claimPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Claim reason is required' });
    }

    const payment = await PaymentCollection.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment is not available for claim' });
    }

    // Check if employee has sales access
    const employee = await Employee.findById(req.user.id);
    if (!employee || !employee.access.sales) {
      return res.status(403).json({ message: 'You do not have permission to claim payments' });
    }

    await payment.claimPayment(req.user.id, reason);
    
    // Update employee's payment collection stats
    employee.paymentCollection += payment.amount;
    await employee.save();

    res.json({ message: 'Payment claimed successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Payment claim failed', error: error.message });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, notes } = req.body; // action: 'verify' or 'reject'

    if (!notes) {
      return res.status(400).json({ message: 'Verification notes are required' });
    }

    const payment = await PaymentCollection.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'claimed') {
      return res.status(400).json({ message: 'Payment must be claimed before verification' });
    }

    if (action === 'verify') {
      await payment.verifyPayment(req.user.id, notes);
    } else if (action === 'reject') {
      await payment.rejectPayment(req.user.id, notes);
      
      // Reset employee's payment collection stats if rejected
      if (payment.claimedBy) {
        const employee = await Employee.findById(payment.claimedBy);
        if (employee) {
          employee.paymentCollection -= payment.amount;
          await employee.save();
        }
      }
    }

    res.json({ message: `Payment ${action}ed successfully`, payment });
  } catch (error) {
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const stats = await PaymentCollection.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate },
          status: { $in: ['verified', 'claimed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          verifiedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'verified'] }, '$amount', 0]
            }
          },
          verifiedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'verified'] }, 1, 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'claimed'] }, '$amount', 0]
            }
          },
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalAmount: 0,
      totalPayments: 0,
      verifiedAmount: 0,
      verifiedCount: 0,
      pendingAmount: 0,
      pendingCount: 0
    };

    res.json(result);
  } catch (error) {
    console.error('getPaymentStats error:', error); // Log full error to console
    res.status(500).json({ message: 'Failed to fetch payment stats', error: error.message });
  }
};

// Get payments by employee
exports.getPaymentsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    let query = { collectedBy: employeeId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const payments = await PaymentCollection.find(query)
      .populate('claimedBy', 'name employeeId')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaymentCollection.countDocuments(query);
    
    res.json({
      payments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee payments', error: error.message });
  }
};

// Update payment entry
exports.updatePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.status;
    delete updateData.claimedBy;
    delete updateData.verifiedBy;

    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    const payment = await PaymentCollection.findByIdAndUpdate(
      paymentId,
      { ...updateData, updatedBy: req.user.id },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Payment update failed', error: error.message });
  }
};

// Delete payment entry
exports.deletePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await PaymentCollection.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Only allow deletion of pending payments
    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending payments can be deleted' });
    }

    await PaymentCollection.findByIdAndDelete(paymentId);
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Payment deletion failed', error: error.message });
  }
};

// Get all payment entries for frontend
exports.getPaymentEntries = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super-admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admin or super-admin can access payment entries.' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const payments = await PaymentCollection.find(query)
      .populate('claimedBy', 'name employeeId')
      .populate('collectedBy', 'name employeeId')
      .select('amount claimedAmount paymentMethod status claimedBy collectedBy createdAt claimedAt leadId description accountName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await PaymentCollection.countDocuments(query);
    
    // Separate claimed and unclaimed payments
    const unclaimedPayments = payments.filter(p => !p.claimedBy);
    const claimedPayments = payments.filter(p => p.claimedBy);

    res.json({
      payments: unclaimedPayments,
      claimed: claimedPayments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment entries', error: error.message });
  }
};

// Get available payments for employees to claim
exports.getAvailablePayments = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Only employees can view available payments.' });
    }

    // Get payments that are pending (not claimed yet)
    const payments = await PaymentCollection.find({ 
      status: 'pending',
      claimedBy: { $exists: false }
    })
    .sort({ createdAt: -1 })
    .select('amount claimedAmount paymentMethod accountName description createdAt');

    res.json({ 
      payments,
      total: payments.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch available payments', error: error.message });
  }
};

// Claim payment with lead ID
exports.claimPaymentWithLead = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Only employees can claim payments.' });
    }

    const { paymentId } = req.params;
    const { leadId } = req.body;

    if (!leadId) {
      return res.status(400).json({ message: 'Lead ID is required for claiming payment.' });
    }

    const payment = await PaymentCollection.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    if (payment.claimedBy) {
      return res.status(400).json({ message: 'Payment has already been claimed.' });
    }

    // Verify that the employee has access to the lead
    const lead = await Lead.findOne({ 
      _id: leadId, 
      assignedTo: req.user.id 
    });

    if (!lead) {
      return res.status(400).json({ message: 'Lead not found or not assigned to you.' });
    }

    // Calculate total available payment in the lead
    let totalAvailablePayment = 0;
    if (Array.isArray(lead.payments) && lead.payments.length > 0) {
      for (const paymentEntry of lead.payments) {
        if (typeof paymentEntry.govtFees === 'number') totalAvailablePayment += paymentEntry.govtFees;
        if (typeof paymentEntry.advocateFees === 'number') totalAvailablePayment += paymentEntry.advocateFees;
        if (typeof paymentEntry.userStamp === 'number') totalAvailablePayment += paymentEntry.userStamp;
        if (typeof paymentEntry.otherFees === 'number') totalAvailablePayment += paymentEntry.otherFees;
      }
    }

    // Check if lead has payment >= ₹1
    if (totalAvailablePayment < 1) {
      return res.status(400).json({ 
        message: 'This lead has no payment or payment is less than ₹1.',
        availableAmount: totalAvailablePayment
      });
    }

    // Calculate how much can be claimed (minimum of payment amount and available amount)
    const claimableAmount = Math.min(payment.amount, totalAvailablePayment);
    
    // If the payment amount is more than what's available in the lead,
    // we need to create a new payment entry for the remaining amount
    const remainingPaymentAmount = payment.amount - claimableAmount;
    
    // Update payment with claim details
    payment.claimedBy = req.user.id;
    payment.claimedAt = new Date();
    payment.leadId = leadId;
    payment.status = 'claimed';
    payment.claimedAmount = claimableAmount; // Store actual claimed amount

    await payment.save();

    // If there's remaining amount, create a new payment entry for it
    if (remainingPaymentAmount > 0) {
      const remainingPayment = new PaymentCollection({
        amount: remainingPaymentAmount,
        paymentMethod: payment.paymentMethod,
        description: `Remaining amount from payment ${payment._id} (original: ₹${payment.amount}, claimed: ₹${claimableAmount})`,
        status: 'pending',
        createdBy: payment.createdBy,
        accountName: payment.accountName,
        receiptNumber: payment.receiptNumber,
        transactionId: payment.transactionId
      });
      
      await remainingPayment.save();
    }

    // Update employee's payment collection stats with actual claimed amount
    await Employee.findByIdAndUpdate(req.user.id, {
      $inc: { paymentCollection: claimableAmount }
    });

    // Deduct claimed amount from lead's payments array (FIFO)
    let amountToDeduct = claimableAmount;
    if (Array.isArray(lead.payments) && lead.payments.length > 0) {
      for (let i = 0; i < lead.payments.length && amountToDeduct > 0; i++) {
        // Calculate total in this payment entry
        let entryTotal = 0;
        if (typeof lead.payments[i].govtFees === 'number') entryTotal += lead.payments[i].govtFees;
        if (typeof lead.payments[i].advocateFees === 'number') entryTotal += lead.payments[i].advocateFees;
        if (typeof lead.payments[i].userStamp === 'number') entryTotal += lead.payments[i].userStamp;
        if (typeof lead.payments[i].otherFees === 'number') entryTotal += lead.payments[i].otherFees;

        // If entry has any amount left
        if (entryTotal > 0) {
          // Deduct from each fee type in order
          const feeFields = ['govtFees', 'advocateFees', 'userStamp', 'otherFees'];
          for (const field of feeFields) {
            if (amountToDeduct <= 0) break;
            if (typeof lead.payments[i][field] === 'number' && lead.payments[i][field] > 0) {
              const deduct = Math.min(lead.payments[i][field], amountToDeduct);
              lead.payments[i][field] -= deduct;
              amountToDeduct -= deduct;
            }
          }
        }
      }
    }

    // Update paymentClaim.total if present (recalculate as sum of all payments array fields)
    if (lead.paymentClaim) {
      let total = 0;
      if (Array.isArray(lead.payments)) {
        for (const p of lead.payments) {
          if (typeof p.govtFees === 'number') total += p.govtFees;
          if (typeof p.advocateFees === 'number') total += p.advocateFees;
          if (typeof p.userStamp === 'number') total += p.userStamp;
          if (typeof p.otherFees === 'number') total += p.otherFees;
        }
      }
      lead.paymentClaim.total = total;
    }
    await lead.save();

    // Calculate remaining amount in lead after claim
    let remainingAmount = 0;
    if (Array.isArray(lead.payments)) {
      for (const p of lead.payments) {
        if (typeof p.govtFees === 'number') remainingAmount += p.govtFees;
        if (typeof p.advocateFees === 'number') remainingAmount += p.advocateFees;
        if (typeof p.userStamp === 'number') remainingAmount += p.userStamp;
        if (typeof p.otherFees === 'number') remainingAmount += p.otherFees;
      }
    }

    res.json({ 
      message: 'Payment claimed successfully',
      payment: {
        id: payment._id,
        amount: payment.amount,
        claimedAmount: claimableAmount,
        claimedBy: req.user.name,
        leadId: payment.leadId,
        claimedAt: payment.claimedAt
      },
      leadInfo: {
        totalAvailableBefore: totalAvailablePayment,
        claimedAmount: claimableAmount,
        remainingAmount: remainingAmount
      },
      remainingPayment: remainingPaymentAmount > 0 ? {
        amount: remainingPaymentAmount,
        message: `₹${remainingPaymentAmount} returned to Payment Claims for future claims`
      } : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment claim failed', error: error.message });
  }
};

// Check lead payment status for claiming
exports.checkLeadPaymentStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'employee') {
      return res.status(403).json({ message: 'Only employees can check lead payment status.' });
    }

    const { leadId } = req.params;

    if (!leadId) {
      return res.status(400).json({ message: 'Lead ID is required.' });
    }

    // Verify that the employee has access to the lead
    const lead = await Lead.findOne({ 
      _id: leadId, 
      assignedTo: req.user.id 
    });

    if (!lead) {
      return res.status(400).json({ message: 'Lead not found or not assigned to you.' });
    }

    // Calculate total available payment in the lead
    let totalAvailablePayment = 0;
    if (Array.isArray(lead.payments) && lead.payments.length > 0) {
      for (const paymentEntry of lead.payments) {
        if (typeof paymentEntry.govtFees === 'number') totalAvailablePayment += paymentEntry.govtFees;
        if (typeof paymentEntry.advocateFees === 'number') totalAvailablePayment += paymentEntry.advocateFees;
        if (typeof paymentEntry.userStamp === 'number') totalAvailablePayment += paymentEntry.userStamp;
        if (typeof paymentEntry.otherFees === 'number') totalAvailablePayment += paymentEntry.otherFees;
      }
    }

    // Check if lead has payment >= ₹1
    const canClaim = totalAvailablePayment >= 1;

    res.json({ 
      leadId: leadId,
      leadName: lead.name,
      totalAvailablePayment: totalAvailablePayment,
      canClaim: canClaim,
      message: canClaim 
        ? `This lead has ₹${totalAvailablePayment} payment available.` 
        : 'This lead has no payment or payment is less than ₹1.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check lead payment status', error: error.message });
  }
}; 