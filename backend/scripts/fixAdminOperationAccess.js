// Script to set adminAccess.operation=true for all admins
const mongoose = require('mongoose');
const User = require('../models/User');
const db = require('../config/db');

async function fixAdminOperationAccess() {
  try {
    const result = await User.updateMany(
      { role: 'admin' },
      { $set: { 'adminAccess.operation': true } }
    );
    console.log('Updated admins:', result.modifiedCount);
    process.exit(0);
  } catch (err) {
    console.error('Error updating admins:', err);
    process.exit(1);
  }
}

fixAdminOperationAccess(); 