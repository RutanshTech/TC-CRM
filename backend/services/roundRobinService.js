// Round Robin Assignment Logic
const User = require('../models/User');

let lastIndex = 0;

async function getNextEmployee() {
  const employees = await User.find({ role: 'employee', isActive: true }).sort({ _id: 1 });

  if (employees.length === 0) return null;

  const employee = employees[lastIndex % employees.length];
  lastIndex = (lastIndex + 1) % employees.length;

  return employee._id;
}

module.exports = { getNextEmployee };
