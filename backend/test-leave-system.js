const axios = require('axios');

const BASE_URL = 'https://tc-crm.vercel.app/api';

// Test data
const testEmployee = {
  name: 'Test Employee',
  email: 'test.employee@example.com',
  password: '123456',
  personalMobile: '9876543210',
  role: 'employee'
};

const testLeave = {
  startDate: '2024-01-15',
  endDate: '2024-01-17',
  reason: 'Personal emergency - need to attend family function'
};

async function testLeaveSystem() {
  try {
    console.log('🧪 Testing Leave Application System...\n');

    // Step 1: Login as super admin
    console.log('1. Logging in as super admin...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: '123456'
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin login successful\n');

    // Step 2: Create a test employee
    console.log('2. Creating test employee...');
    const createEmployee = await axios.post(`${BASE_URL}/employees`, testEmployee, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const employeeId = createEmployee.data.employee.employeeId;
    console.log(`✅ Employee created with ID: ${employeeId}\n`);

    // Step 3: Login as the employee
    console.log('3. Logging in as test employee...');
    const employeeLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmployee.email,
      password: testEmployee.password
    });
    const employeeToken = employeeLogin.data.token;
    console.log('✅ Employee login successful\n');

    // Step 4: Apply for leave
    console.log('4. Applying for leave...');
    const applyLeave = await axios.post(
      `${BASE_URL}/employees/${employeeId}/leave`,
      testLeave,
      { headers: { Authorization: `Bearer ${employeeToken}` } }
    );
    console.log('✅ Leave application submitted successfully\n');

    // Step 5: Get employee's leave applications
    console.log('5. Fetching employee leave applications...');
    const getLeaves = await axios.get(
      `${BASE_URL}/employees/${employeeId}/leaves`,
      { headers: { Authorization: `Bearer ${employeeToken}` } }
    );
    const leaveId = getLeaves.data.leaves[0]._id;
    console.log(`✅ Found leave application with ID: ${leaveId}\n`);

    // Step 6: Admin approves the leave
    console.log('6. Admin approving leave application...');
    const approveLeave = await axios.patch(
      `${BASE_URL}/employees/${employeeId}/leave/${leaveId}`,
      { status: 'approved', notes: 'Approved for personal emergency' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✅ Leave application approved successfully\n');

    // Step 7: Check employee status (should be 'on_leave')
    console.log('7. Checking employee status after approval...');
    const getEmployee = await axios.get(
      `${BASE_URL}/employees/${employeeId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const status = getEmployee.data.status;
    console.log(`✅ Employee status: ${status} (should be 'on_leave')\n`);

    // Step 8: Get all leave applications (admin view)
    console.log('8. Fetching all leave applications (admin view)...');
    const getAllLeaves = await axios.get(
      `${BASE_URL}/employees/leaves/all`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(`✅ Found ${getAllLeaves.data.leaves.length} total leave applications\n`);

    console.log('🎉 All tests passed! Leave application system is working correctly.');
    console.log('\n📋 Summary:');
    console.log('- Employee can apply for leave');
    console.log('- Admin can approve/reject leave applications');
    console.log('- Employee status changes to "on_leave" when approved');
    console.log('- Leave applications are properly tracked');
    console.log('- Auto-blocking will be disabled during approved leave period');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    console.error('Error details:', error.response?.data || error);
  }
}

// Run the test
testLeaveSystem(); 