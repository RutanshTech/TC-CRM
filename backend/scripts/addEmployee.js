// Script to add a new active employee
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const User = require('../models/User');
dotenv.config();

async function addEmployee() {
  try {
    // Use the same connection string as the main app
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tc_crm';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if employee already exists
    const existingEmployee = await Employee.findOne({ email: 'employee@test.com' });
    if (existingEmployee) {
      console.log('Employee already exists:', existingEmployee.email);
      await mongoose.disconnect();
      return;
    }

    const hash = await bcrypt.hash('123456', 10);

    // Find an admin user to set as createdBy
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      await mongoose.disconnect();
      return;
    }

    const employee = await Employee.create({
      name: 'Test Employee',
      email: 'employee@test.com',
      password: hash,
      plainPassword: '123456',
      role: 'employee',
      isActive: true,
      personalMobile: '9876543210',
      companyEmail: 'employee@company.com',
      aadharCard: '123456789012',
      panCard: 'ABCDE1234F',
      bankDetails: {
        accountNumber: '1234567890',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
        accountHolderName: 'Test Employee'
      },
      access: {
        sales: true,
        operation: false,
        advocate: false,
        leadAdd: true,
        copy: false
      },
      onboardingStatus: 'completed',
      createdBy: adminUser._id,
      createdByModel: 'User',
      createdByRole: 'admin'
    });

    console.log('Employee created successfully:', {
      name: employee.name,
      email: employee.email,
      employeeId: employee.employeeId,
      password: '123456'
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating employee:', error);
    await mongoose.disconnect();
  }
}

async function activateAllUsers() {
  await mongoose.connect('mongodb://localhost:27017/your-db-name'); // Change to your DB name
  await User.updateMany({}, { $set: { isActive: true, role: 'advocate' } });
  console.log('All users activated and set to advocate role.');
  await mongoose.disconnect();
}

addEmployee();
activateAllUsers(); 