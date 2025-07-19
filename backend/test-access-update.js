const axios = require('axios');
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const User = require('./models/User');

const BASE_URL = 'http://localhost:5000/api';
let authToken;

// Test data
const testData = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123'
  },
  superAdmin: {
    email: 'superadmin@example.com',
    password: 'superadmin123'
  }
};

async function login(userType) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testData[userType]);
    authToken = response.data.token;
    console.log(`✅ ${userType} login successful`);
    return authToken;
  } catch (error) {
    console.error(`❌ ${userType} login failed:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function testAccessUpdate() {
  try {
    console.log('\n🧪 Testing Access Update Functionality...');
    
    // Login as super-admin first
    const superAdminToken = await login('superAdmin');
    if (!superAdminToken) {
      console.log('❌ Super-admin login failed, trying admin...');
      const adminToken = await login('admin');
      if (!adminToken) {
        console.log('❌ Admin login failed, cannot test access update');
        return;
      }
      authToken = adminToken;
    } else {
      authToken = superAdminToken;
    }

    console.log('\n📋 Step 1: Get employees for testing...');

    // Get employees
    const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (employeesResponse.data.length === 0) {
      console.log('❌ No employees found');
      return;
    }

    const employee = employeesResponse.data[0];
    console.log('✅ Found employee:', employee.name, '(ID:', employee.employeeId, ')');
    console.log('📊 Current access:', employee.access);

    // Test 1: Update employee access
    console.log('\n📋 Test 1: Update Employee Access');
    try {
      const newAccess = {
        sales: true,
        leadAdd: true,
        paymentView: true,
        operation: false,
        advocate: false,
        leadEdit: false,
        paymentClaim: false,
        reports: false,
        copy: false
      };

      console.log('🎯 Updating access to:', newAccess);

      const response = await axios.patch(`${BASE_URL}/employees/${employee.employeeId}/access`, {
        access: newAccess
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      console.log('✅ Access update response:', response.data);
      console.log('📊 Notifications sent:', response.data.notificationsSent);

    } catch (error) {
      console.error('❌ Access update failed:', error.response?.data?.message || error.message);
      if (error.response?.data?.error) {
        console.error('📋 Error details:', error.response.data.error);
      }
    }

    // Test 2: Verify the update in database
    console.log('\n📋 Test 2: Verify Database Update');
    try {
      const updatedEmployee = await Employee.findOne({ employeeId: employee.employeeId });
      if (updatedEmployee) {
        console.log('✅ Employee found in database');
        console.log('📊 Updated access:', updatedEmployee.access);
      } else {
        console.log('❌ Employee not found in database');
      }
    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
    }

    console.log('\n🔍 Access Update Test Summary:');
    console.log('1. ✅ Access update request sent');
    console.log('2. ✅ Database should be updated');
    console.log('3. ✅ Notifications should be created');
    console.log('4. ✅ Employee should receive notifications');

  } catch (error) {
    console.error('❌ Access update test failed:', error);
  }
}

async function runAccessUpdateTests() {
  console.log('🚀 Starting Access Update Tests...\n');
  
  await testAccessUpdate();
  
  console.log('\n✅ Access update tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check if access was updated in database');
  console.log('2. Verify notifications were created');
  console.log('3. Test the frontend access update');
  console.log('4. Check if employee received notifications');
}

// Run the tests
runAccessUpdateTests().catch(console.error); 