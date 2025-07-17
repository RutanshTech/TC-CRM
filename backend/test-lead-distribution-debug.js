const axios = require('axios');

async function testLeadDistribution() {
  try {
    console.log('=== Testing Lead Distribution Endpoint ===\n');
    
    // First, let's login to get a valid token
    console.log('1. Logging in to get token...');
    const loginResponse = await axios.post('https://tc-crm.vercel.app/api/auth/login', {
      email: 'admin@example.com',
      password: '123456',
      role: 'super-admin'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test 1: Valid data
    console.log('\n2. Testing with valid data...');
    const testData1 = {
      leadIds: ['507f1f77bcf86cd799439011'], // Example ObjectId
      employeeIds: ['507f1f77bcf86cd799439012'] // Example ObjectId
    };
    
    try {
      const response1 = await axios.post('https://tc-crm.vercel.app/api/leads/distribute', testData1, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test 1 passed:', response1.data);
    } catch (error) {
      console.log('❌ Test 1 failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
    // Test 2: Empty arrays
    console.log('\n3. Testing with empty arrays...');
    const testData2 = {
      leadIds: [],
      employeeIds: []
    };
    
    try {
      const response2 = await axios.post('https://tc-crm.vercel.app/api/leads/distribute', testData2, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test 2 passed:', response2.data);
    } catch (error) {
      console.log('❌ Test 2 failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
    // Test 3: Missing fields
    console.log('\n4. Testing with missing fields...');
    const testData3 = {
      leadIds: ['507f1f77bcf86cd799439011']
      // Missing employeeIds
    };
    
    try {
      const response3 = await axios.post('https://tc-crm.vercel.app/api/leads/distribute', testData3, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test 3 passed:', response3.data);
    } catch (error) {
      console.log('❌ Test 3 failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
    // Test 4: Non-array values
    console.log('\n5. Testing with non-array values...');
    const testData4 = {
      leadIds: '507f1f77bcf86cd799439011', // String instead of array
      employeeIds: '507f1f77bcf86cd799439012' // String instead of array
    };
    
    try {
      const response4 = await axios.post('https://tc-crm.vercel.app/api/leads/distribute', testData4, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test 4 passed:', response4.data);
    } catch (error) {
      console.log('❌ Test 4 failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
    // Test 5: Null values
    console.log('\n6. Testing with null values...');
    const testData5 = {
      leadIds: null,
      employeeIds: null
    };
    
    try {
      const response5 = await axios.post('https://tc-crm.vercel.app/api/leads/distribute', testData5, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Test 5 passed:', response5.data);
    } catch (error) {
      console.log('❌ Test 5 failed:');
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }
    
    console.log('\n=== All tests complete ===');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

testLeadDistribution(); 