// Script to update or create super admin user
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/TC';

async function run() {
  await mongoose.connect(MONGO_URI);
  const email = 'S.A@TMC.in';
  const password = 'TMCR.24@25';
  const hash = await bcrypt.hash(password, 10);

  let user = await User.findOne({ role: 'super-admin' });
  if (user) {
    user.email = email;
    user.password = hash;
    user.plainPassword = password;
    await user.save();
    console.log('Super Admin updated:', email);
  } else {
    user = await User.create({
      name: 'Super Admin',
      email,
      password: hash,
      plainPassword: password,
      role: 'super-admin',
      isActive: true,
      onboardingStatus: 'completed',
      status: 'online'
    });
    console.log('Super Admin created:', email);
  }
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); }); 