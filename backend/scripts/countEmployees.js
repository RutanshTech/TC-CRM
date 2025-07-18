require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const dbUri = process.env.MONGO_URI || 'mongodb://localhost:27017/tc_crm';

async function printAllEmployees() {
  try {
    await mongoose.connect(dbUri);
    const employees = await Employee.find({});
    console.log('Total employees in Employee collection:', employees.length);
    employees.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.name} (${emp.employeeId || emp.email})`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error fetching employees:', err);
    process.exit(1);
  }
}

printAllEmployees(); 