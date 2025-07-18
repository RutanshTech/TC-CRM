// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// dotenv.config();
// const Lead = require('../models/Lead');
// const User = require('../models/User');

// async function fixAssignedBy() {
//   await mongoose.connect(process.env.MONGO_URI);
//   const adminUser = await User.findOne({ role: { $in: ['admin', 'super-admin'] } });
//   if (!adminUser) {
//     console.error('No admin or super-admin user found.');
//     process.exit(1);
//   }
//   const result = await Lead.updateMany(
//     { assignedTo: { $exists: true, $ne: null }, $or: [{ assignedBy: { $exists: false } }, { assignedBy: null }] },
//     { $set: { assignedBy: adminUser._id } }
//   );
//   console.log(`Updated ${result.modifiedCount || result.nModified || 0} leads.`);
//   process.exit(0);
// }

// fixAssignedBy(); 