const mongoose = require('mongoose');
const { getPhoneNumberAssignment, validateLeadAssignments, assignLeadsWithPhoneValidation } = require('./services/phoneNumberAssignmentService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/tc-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testPhoneAssignment() {
  try {
    console.log('Testing phone number assignment functionality...\n');
    
    // Test 1: Check if a phone number is assigned
    console.log('Test 1: Checking phone number assignment...');
    const phoneNumber = '9876543210';
    const assignment = await getPhoneNumberAssignment(phoneNumber);
    
    if (assignment) {
      console.log(`✅ Phone number ${phoneNumber} is assigned to: ${assignment.employeeName} (${assignment.employeeEmployeeId})`);
    } else {
      console.log(`❌ Phone number ${phoneNumber} is not assigned to any employee`);
    }
    
    // Test 2: Validate lead assignments
    console.log('\nTest 2: Validating lead assignments...');
    const leadIds = ['507f1f77bcf86cd799439011']; // Replace with actual lead ID
    const employeeIds = ['507f1f77bcf86cd799439012']; // Replace with actual employee ID
    
    const validation = await validateLeadAssignments(leadIds, employeeIds);
    
    if (validation.success) {
      console.log('✅ Lead assignment validation passed');
      console.log(`Valid assignments: ${validation.validAssignments.length}`);
      console.log(`Reassignments: ${validation.validAssignments.filter(a => a.isReassignment).length}`);
      console.log(`New assignments: ${validation.validAssignments.filter(a => !a.isReassignment).length}`);
    } else {
      console.log('❌ Lead assignment validation failed');
      validation.errors.forEach(error => console.log(`Error: ${error}`));
    }
    
    console.log('\n✅ Phone assignment tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testPhoneAssignment(); 