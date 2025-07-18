// Round Robin Assignment Logic
const Employee = require('../models/Employee');

let lastIndex = 0;

async function getNextEmployee() {
  try {
    console.log('getNextEmployee called');
    const employees = await Employee.find({ 
      isActive: true, 
      status: { $in: ['online', 'offline'] } 
    }).sort({ _id: 1 });

    console.log('Found employees:', employees.length);
    
    if (employees.length === 0) {
      console.log('No active employees found');
      return null;
    }

    const employee = employees[lastIndex % employees.length];
    lastIndex = (lastIndex + 1) % employees.length;

    console.log('Selected employee:', employee._id);
    return employee._id;
  } catch (error) {
    console.error('Error in getNextEmployee:', error);
    return null;
  }
}

module.exports = { getNextEmployee };
