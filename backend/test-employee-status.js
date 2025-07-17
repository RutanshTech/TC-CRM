const axios = require('axios');

// Test the new employee status update endpoint
async function testEmployeeStatusUpdate() {
  try {
    console.log('Testing employee status update...');
    
    // First, login as an employee to get a token
    const loginResponse = await axios.post('https://tc-crm.vercel.app/api/auth/login', {
      email: 'employee@example.com', // Replace with actual employee email
      password: 'password123' // Replace with actual password
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Test updating own status to online
    const onlineResponse = await axios.patch('https://tc-crm.vercel.app/api/employees/status', {
      status: 'online'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Status updated to online:', onlineResponse.data);
    
    // Test updating own status to offline
    const offlineResponse = await axios.patch('https://tc-crm.vercel.app/api/employees/status', {
      status: 'offline'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Status updated to offline:', offlineResponse.data);
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmployeeStatusUpdate(); 