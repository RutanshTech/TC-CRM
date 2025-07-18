const axios = require('axios');

async function testLeadDistribution() {
  try {
    console.log('Testing lead distribution endpoint...');
    
    // Test with minimal data
    const testData = {
      leadIds: ['507f1f77bcf86cd799439011'], // Example ObjectId
      employeeIds: ['507f1f77bcf86cd799439012'] // Example ObjectId
    };
    
    console.log('Request data:', testData);
    
    const response = await axios.post('tc-crm.vercel.app/api/leads/distribute', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error details:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

// Test with empty arrays
async function testEmptyArrays() {
  try {
    console.log('\nTesting with empty arrays...');
    
    const testData = {
      leadIds: [],
      employeeIds: []
    };
    
    const response = await axios.post('tc-crm.vercel.app/api/leads/distribute', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Empty arrays error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

// Test with missing fields
async function testMissingFields() {
  try {
    console.log('\nTesting with missing fields...');
    
    const testData = {
      leadIds: ['507f1f77bcf86cd799439011']
      // Missing employeeIds
    };
    
    const response = await axios.post('tc-crm.vercel.app/api/leads/distribute', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Missing fields error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

// Test with non-array values
async function testNonArrayValues() {
  try {
    console.log('\nTesting with non-array values...');
    
    const testData = {
      leadIds: '507f1f77bcf86cd799439011', // String instead of array
      employeeIds: '507f1f77bcf86cd799439012' // String instead of array
    };
    
    const response = await axios.post('tc-crm.vercel.app/api/leads/distribute', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Non-array values error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Lead Distribution Debug Tests ===\n');
  
  await testLeadDistribution();
  await testEmptyArrays();
  await testMissingFields();
  await testNonArrayValues();
  
  console.log('\n=== Tests Complete ===');
}

runAllTests(); 