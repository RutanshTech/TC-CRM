const axios = require('axios');

// Test configuration
const BASE_URL = 'tc-crm.vercel.app/api';
const TEST_EMPLOYEE_ID = 'TEST001'; // Replace with an actual employee ID from your database

// Test cases
async function testBlockWithoutReason() {
  console.log('Testing block without reason...');
  try {
    const response = await axios.post(`${BASE_URL}/employees/${TEST_EMPLOYEE_ID}/block`, {}, {
      headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
    });
    console.log('❌ Block without reason should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'Block reason is mandatory') {
      console.log('✅ Block without reason correctly rejected');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testBlockWithReason() {
  console.log('Testing block with reason...');
  try {
    const response = await axios.post(`${BASE_URL}/employees/${TEST_EMPLOYEE_ID}/block`, {
      reason: 'Test blocking with mandatory reason'
    }, {
      headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
    });
    console.log('✅ Block with reason succeeded');
  } catch (error) {
    console.log('❌ Block with reason failed:', error.response?.data || error.message);
  }
}

async function testUnblockWithoutReason() {
  console.log('Testing unblock without reason...');
  try {
    const response = await axios.post(`${BASE_URL}/employees/${TEST_EMPLOYEE_ID}/unblock`, {}, {
      headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
    });
    console.log('❌ Unblock without reason should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'Unblock reason is mandatory') {
      console.log('✅ Unblock without reason correctly rejected');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testUnblockWithReason() {
  console.log('Testing unblock with reason...');
  try {
    const response = await axios.post(`${BASE_URL}/employees/${TEST_EMPLOYEE_ID}/unblock`, {
      reason: 'Test unblocking with mandatory reason'
    }, {
      headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
    });
    console.log('✅ Unblock with reason succeeded');
  } catch (error) {
    console.log('❌ Unblock with reason failed:', error.response?.data || error.message);
  }
}

async function testStatusUpdateBlockWithoutReason() {
  console.log('Testing status update to blocked without reason...');
  try {
    const response = await axios.patch(`${BASE_URL}/employees/${TEST_EMPLOYEE_ID}/status`, {
      status: 'blocked'
    }, {
      headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
    });
    console.log('❌ Status update to blocked without reason should have failed but succeeded');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message === 'Block reason is mandatory') {
      console.log('✅ Status update to blocked without reason correctly rejected');
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

async function testStatusUpdateBlockWithReason() {
  console.log('Testing status update to blocked with reason...');
  try {
    const response = await axios.patch(`${BASE_URL}/employees/${TEST_EMPLOYEE_ID}/status`, {
      status: 'blocked',
      reason: 'Test status update blocking with mandatory reason'
    }, {
      headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
    });
    console.log('✅ Status update to blocked with reason succeeded');
  } catch (error) {
    console.log('❌ Status update to blocked with reason failed:', error.response?.data || error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing Block/Unblock with Mandatory Reasons\n');
  
  await testBlockWithoutReason();
  console.log('');
  
  await testBlockWithReason();
  console.log('');
  
  await testUnblockWithoutReason();
  console.log('');
  
  await testUnblockWithReason();
  console.log('');
  
  await testStatusUpdateBlockWithoutReason();
  console.log('');
  
  await testStatusUpdateBlockWithReason();
  console.log('');
  
  console.log('🏁 All tests completed!');
}

// Instructions for running the test
console.log(`
📋 Test Instructions:
1. Make sure your backend server is running on tc-crm.vercel.app
2. Replace 'YOUR_TOKEN_HERE' with a valid admin token
3. Replace 'TEST001' with an actual employee ID from your database
4. Run: node test-block-unblock.js

The tests will verify that:
- Blocking without reason is rejected
- Blocking with reason is accepted
- Unblocking without reason is rejected  
- Unblocking with reason is accepted
- Status update to blocked without reason is rejected
- Status update to blocked with reason is accepted
`);

// Uncomment the line below to run tests
// runTests(); 