const axios = require('axios');

async function testLoginValidation() {
  const baseURL = 'https://tc-crm.vercel.app/api/auth/login';
  
  console.log('Testing Login Validation...\n');

  // Test 1: Login without role (should fail)
  console.log('1. Testing login without role...');
  try {
    await axios.post(baseURL, {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25'
    });
    console.log('❌ Should have failed - role validation not working');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'Role selection is required') {
      console.log('✅ Correctly rejected login without role');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message);
    }
  }

  // Test 2: Login with wrong role (should fail)
  console.log('\n2. Testing login with wrong role...');
  try {
    await axios.post(baseURL, {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25',
      role: 'employee'
    });
    console.log('❌ Should have failed - wrong role validation not working');
  } catch (error) {
    if (error.response?.status === 401 && error.response?.data?.message.includes('Invalid role selection')) {
      console.log('✅ Correctly rejected login with wrong role');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message);
    }
  }

  // Test 3: Login with correct role (should succeed)
  console.log('\n3. Testing login with correct role...');
  try {
    const response = await axios.post(baseURL, {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25',
      role: 'super-admin'
    });
    console.log('✅ Login successful with correct role');
    console.log('User role:', response.data.user.role);
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message);
  }

  // Test 4: Login with empty role (should fail)
  console.log('\n4. Testing login with empty role...');
  try {
    await axios.post(baseURL, {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25',
      role: ''
    });
    console.log('❌ Should have failed - empty role validation not working');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'Role selection is required') {
      console.log('✅ Correctly rejected login with empty role');
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message);
    }
  }
}

testLoginValidation(); 