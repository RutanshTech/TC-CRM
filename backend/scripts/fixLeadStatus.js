// Script to set status='pending' for all leads where status is missing
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const connectDB = require('../config/db');

async function fixLeadStatus() {
  await connectDB();
  const result = await Lead.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'pending' } }
  );
  console.log(`Updated ${result.modifiedCount} leads to status='pending'`);
  mongoose.connection.close();
}

fixLeadStatus(); 