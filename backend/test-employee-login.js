const axios = require('axios');

// Test employee login
async function testEmployeeLogin() {
  try {
    console.log('Testing employee login...');
    
    const response = await axios.post('https://tc-crm.vercel.app/api/auth/employee-login', {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25'
    });
    
    console.log('Login successful!');
    console.log('User data:', response.data.user);
    console.log('User type:', response.data.userType);
    console.log('Token:', response.data.token.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

// Test regular login with employee role
async function testRegularLogin() {
  try {
    console.log('\nTesting regular login with employee role...');
    
    const response = await axios.post('https://tc-crm.vercel.app/api/auth/login', {
      email: 'employee@test.com',
      password: '123456',
      role: 'employee'
    });
    
    console.log('Login successful!');
    console.log('User data:', response.data.user);
    console.log('User type:', response.data.userType);
    
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testEmployeeLogin();
  await testRegularLogin();
}

runTests(); 