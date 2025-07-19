// Cron Jobs for Timeout and Follow-ups
const cron = require('node-cron');
const { autoFollowUpReminder } = require('../services/whatsappService');
const SessionLog = require('../models/SessionLog');
const Employee = require('../models/Employee');
const User = require('../models/User');

// Run WhatsApp Follow-up at 10:00 AM daily
cron.schedule('0 10 * * *', () => {
  // console.log('Running WhatsApp Follow-up job');
  autoFollowUpReminder();
});

// Check inactivity every 5 mins
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 30010);

  const inactive = await SessionLog.find({ lastActivity: { $lt: thirtyMinAgo }, isActive: true });

  for (const session of inactive) {
    session.isActive = false;
    await session.save();
    // console.log(`Logged out user ${session.userId} due to inactivity`);
  }
});

// Every 5 minutes, block employees who are offline for more than 10 minutes (excluding those on approved leave)
cron.schedule('*/5 * * * *', async () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const employees = await Employee.find({
    status: 'offline',
    isBlocked: false,
    lastActiveTime: { $lt: tenMinutesAgo }
  });

  for (const emp of employees) {
    // Check if employee has any approved leave that hasn't expired
    const hasActiveLeave = emp.leaveApplications.some(leave => 
      leave.status === 'approved' && 
      leave.endDate > new Date()
    );
    
    if (!hasActiveLeave) {
      emp.status = 'blocked';
      emp.isBlocked = true;
      emp.blockedReason = 'Inactive for 10 minutes';
      emp.blockedAt = new Date();
      await emp.save();
      // console.log(`Blocked employee ${emp.employeeId} due to inactivity`);
    }
  }
});

// Every 5 minutes, block employees who are online but inactive for more than 30 minutes (excluding those on approved leave)
cron.schedule('*/5 * * * *', async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const employees = await Employee.find({
    status: 'online',
    isBlocked: false,
    lastActiveTime: { $lt: thirtyMinutesAgo }
  });

  for (const emp of employees) {
    // Check if employee has any approved leave that hasn't expired
    const hasActiveLeave = emp.leaveApplications.some(leave => 
      leave.status === 'approved' && 
      leave.endDate > new Date()
    );
    
    if (!hasActiveLeave) {
      emp.status = 'blocked';
      emp.isBlocked = true;
      emp.blockedReason = 'Inactive (no activity) for 30 minutes';
      emp.blockedAt = new Date();
      await emp.save();
      // console.log(`Blocked employee ${emp.employeeId} due to inactivity while online`);
    }
  }
});

// Every hour, check for expired leaves and update employee status
cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const employees = await Employee.find({
    status: 'on_leave',
    'leaveApplications.status': 'approved'
  });

  for (const emp of employees) {
    // Check if all approved leaves have expired
    const hasActiveLeave = emp.leaveApplications.some(leave => 
      leave.status === 'approved' && 
      leave.endDate > now
    );
    
    if (!hasActiveLeave) {
      // All leaves have expired, change status back to offline
      emp.status = 'offline';
      await emp.save();
      await emp.logActivity('Leave period ended, status changed to offline');
      // console.log(`Employee ${emp.employeeId} leave period ended`);
    }
  }
});

// Every 5 minutes, set status 'on_leave' for employees whose approved leave is currently active
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const employees = await Employee.find({
    isBlocked: false,
    'leaveApplications.status': 'approved'
  });

  for (const emp of employees) {
    // Find if there is any currently active leave
    const hasActiveLeave = emp.leaveApplications.some(leave =>
      leave.status === 'approved' &&
      new Date(leave.startDate) <= now &&
      new Date(leave.endDate) >= now
    );
    if (hasActiveLeave && emp.status !== 'on_leave') {
      emp.status = 'on_leave';
      await emp.save();
      await emp.logActivity('Leave period started, status changed to on_leave');
    }
  }
});
