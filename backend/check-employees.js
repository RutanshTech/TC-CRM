const mongoose = require('mongoose');
const Employee = require('./models/Employee');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tc-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkEmployees() {
  try {
    console.log('Checking employees...');
    
    const allEmployees = await Employee.find({});
    console.log('Total employees:', allEmployees.length);
    
    const activeEmployees = await Employee.find({ isActive: true });
    console.log('Active employees:', activeEmployees.length);
    
    const onlineEmployees = await Employee.find({ 
      isActive: true, 
      status: { $in: ['online', 'offline'] } 
    });
    console.log('Online/Offline employees:', onlineEmployees.length);
    
    if (onlineEmployees.length > 0) {
      console.log('Available employees:');
      onlineEmployees.forEach(emp => {
        console.log(`- ${emp.name} (${emp.employeeId}) - Status: ${emp.status}`);
      });
    } else {
      console.log('No active employees found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkEmployees(); 