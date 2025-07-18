const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API endpoints...\n');

    // Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post('tc-crm.vercel.app/api/auth/login', {
      email: 'S.A@TMC.in',
      password: 'TMCR.24@25',
      role: 'super-admin'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.token;
    console.log('Token:', token.substring(0, 50) + '...');

    // Test getting admins
    console.log('\n2. Testing get admins...');
    const adminsResponse = await axios.get('tc-crm.vercel.app/api/adminsget', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Got admins:', adminsResponse.data.length);
    
    if (adminsResponse.data.length > 0) {
      const admin = adminsResponse.data[0];
      console.log('First admin:', admin.adminId, admin.name);
      
      // Test permissions endpoint
      console.log('\n3. Testing permissions endpoint...');
      try {
        const permissionsResponse = await axios.get(`tc-crm.vercel.app/api/admin/${admin.adminId}/permissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Got permissions:', permissionsResponse.data);
        
        // Test updating permissions
        console.log('\n4. Testing update permissions...');
        const newPermissions = {
          employee: true,
          sales: false,
          operation: true,
          advocate: false,
          allThings: false
        };
        
        const updateResponse = await axios.patch(`tc-crm.vercel.app/api/admin/${admin.adminId}/permissions`, {
          adminAccess: newPermissions
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Updated permissions successfully:', updateResponse.data);
        
      } catch (error) {
        console.log('❌ Permissions error:', error.response?.data?.message || error.message);
        console.log('Status:', error.response?.status);
        console.log('Full error:', error.response?.data);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

testAPI(); 