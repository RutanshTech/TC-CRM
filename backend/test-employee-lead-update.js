const axios = require('axios');

// Test employee lead update
async function testEmployeeLeadUpdate() {
  try {
    console.log('Testing employee lead update...');
    
    // First, login as an employee to get a token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'employee@test.com', // Replace with actual employee email
      password: '123456', // Replace with actual password
      role: 'employee'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('Login successful, user:', user);
    
    // Get the employee's leads
    const leadsResponse = await axios.get('http://localhost:3000/api/leads/my', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Employee leads:', leadsResponse.data);
    
    if (leadsResponse.data.length === 0) {
      console.log('No leads assigned to employee');
      return;
    }
    
    const firstLead = leadsResponse.data[0];
    console.log('Testing with lead:', firstLead._id);
    
    // Test updating the lead
    const updateData = {
      followUpStatus: 'Test Update ' + new Date().toISOString(),
      additionalNotes: 'Test notes from employee update'
    };
    
    console.log('Sending update data:', updateData);
    
    const updateResponse = await axios.put(`http://localhost:3000/api/leads/${firstLead._id}/employee`, updateData, {
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      }
    });
    
    console.log('Update response:', updateResponse.data);
    console.log('✅ Lead update successful!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testEmployeeLeadUpdate(); 