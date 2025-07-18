const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const loginData = {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25',
      role: 'super-admin'
    };
    
    console.log('Login data:', loginData);
    
    const response = await axios.post('tc-crm.vercel.app/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testLogin(); 