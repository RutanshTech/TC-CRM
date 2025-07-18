const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken;

// Test data
const testData = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123'
  },
  employee: {
    email: 'employee@example.com',
    password: 'employee123'
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

async function testLeadAssignment() {
  try {
    console.log('\n🧪 Testing Lead Assignment Notifications...');
    
    // First, get some leads and employees
    const leadsResponse = await axios.get(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const employeesResponse = await axios.get(`${BASE_URL}/employees/for-lead-distribution`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (leadsResponse.data.length === 0) {
      console.log('⚠️ No leads available for testing');
      return;
    }
    
    if (employeesResponse.data.length === 0) {
      console.log('⚠️ No employees available for testing');
      return;
    }
    
    // Assign leads to employees
    const leadIds = [leadsResponse.data[0]._id];
    const employeeIds = [employeesResponse.data[0]._id];
    
    const assignmentResponse = await axios.post(`${BASE_URL}/leads/assign`, {
      leadIds,
      employeeIds
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Lead assignment test completed');
    console.log('📊 Assignment result:', assignmentResponse.data);
    
  } catch (error) {
    console.error('❌ Lead assignment test failed:', error.response?.data?.message || error.message);
  }
}

async function testPaymentCreation() {
  try {
    console.log('\n🧪 Testing Payment Creation Notifications...');
    
    const paymentData = {
      amount: 5000,
      paymentMethod: 'cash',
      leadId: 'TEST_LEAD_001',
      leadPhoneNumber: '9876543210',
      leadCompanyName: 'Test Company',
      description: 'Test payment for notification testing',
      receiptNumber: 'RCPT001',
      transactionId: 'TXN001'
    };
    
    const response = await axios.post(`${BASE_URL}/payments`, paymentData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Payment creation test completed');
    console.log('📊 Payment result:', response.data);
    
  } catch (error) {
    console.error('❌ Payment creation test failed:', error.response?.data?.message || error.message);
  }
}

async function testAccessGrant() {
  try {
    console.log('\n🧪 Testing Access Grant Notifications...');
    
    // First, get an employee
    const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (employeesResponse.data.length === 0) {
      console.log('⚠️ No employees available for testing');
      return;
    }
    
    const employeeId = employeesResponse.data[0].employeeId;
    
    // Grant access
    const accessData = {
      access: {
        sales: true,
        leadAdd: true,
        paymentView: true
      }
    };
    
    const response = await axios.patch(`${BASE_URL}/employees/${employeeId}/access`, accessData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Access grant test completed');
    console.log('📊 Access result:', response.data);
    
  } catch (error) {
    console.error('❌ Access grant test failed:', error.response?.data?.message || error.message);
  }
}

async function testLeaveApplication() {
  try {
    console.log('\n🧪 Testing Leave Application Notifications...');
    
    // First, login as employee
    const employeeToken = await login('employee');
    if (!employeeToken) {
      console.log('⚠️ Employee login failed, skipping leave test');
      return;
    }
    
    // Apply for leave
    const leaveData = {
      startDate: '2024-02-15',
      endDate: '2024-02-16',
      reason: 'Test leave application for notification testing'
    };
    
    const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    
    if (employeesResponse.data.length === 0) {
      console.log('⚠️ No employees available for testing');
      return;
    }
    
    const employeeId = employeesResponse.data[0].employeeId;
    
    const leaveResponse = await axios.post(`${BASE_URL}/employees/${employeeId}/leave`, leaveData, {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    
    console.log('✅ Leave application test completed');
    console.log('📊 Leave result:', leaveResponse.data);
    
    // Now login as admin and approve the leave
    await login('admin');
    
    // Get the leave applications
    const approvalsResponse = await axios.get(`${BASE_URL}/employees/approvals`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (approvalsResponse.data.leaveApplications.length > 0) {
      const leaveId = approvalsResponse.data.leaveApplications[0].id;
      
      const approvalData = {
        action: 'approve',
        notes: 'Test approval for notification testing'
      };
      
      const approvalResponse = await axios.post(`${BASE_URL}/employees/approvals`, {
        type: 'leave',
        id: leaveId,
        ...approvalData
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Leave approval test completed');
      console.log('📊 Approval result:', approvalResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Leave application test failed:', error.response?.data?.message || error.message);
  }
}

async function testAdminAccessGrant() {
  try {
    console.log('\n🧪 Testing Admin Access Grant Notifications...');
    
    // First, get an admin
    const adminsResponse = await axios.get(`${BASE_URL}/admins`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (adminsResponse.data.length === 0) {
      console.log('⚠️ No admins available for testing');
      return;
    }
    
    const adminId = adminsResponse.data[0].adminId;
    
    // Grant access to admin
    const accessData = {
      adminAccess: {
        employee: true,
        sales: true,
        operation: true,
        advocate: true
      }
    };
    
    const response = await axios.patch(`${BASE_URL}/admins/${adminId}/permissions`, accessData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Admin access grant test completed');
    console.log('📊 Access result:', response.data);
    
  } catch (error) {
    console.error('❌ Admin access grant test failed:', error.response?.data?.message || error.message);
  }
}

async function testAdminPasswordChange() {
  try {
    console.log('\n🧪 Testing Admin Password Change Notifications...');
    
    // First, get an admin
    const adminsResponse = await axios.get(`${BASE_URL}/admins`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (adminsResponse.data.length === 0) {
      console.log('⚠️ No admins available for testing');
      return;
    }
    
    const adminId = adminsResponse.data[0].adminId;
    
    // Change admin password
    const passwordData = {
      newPassword: 'newAdminPassword123'
    };
    
    const response = await axios.patch(`${BASE_URL}/admins/${adminId}/reset-password`, passwordData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Admin password change test completed');
    console.log('📊 Password change result:', response.data);
    
  } catch (error) {
    console.error('❌ Admin password change test failed:', error.response?.data?.message || error.message);
  }
}

async function testNotifications() {
  try {
    console.log('\n🧪 Testing Notification Retrieval...');
    
    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Notifications retrieved successfully');
    console.log(`📊 Total notifications: ${response.data.notifications.length}`);
    console.log(`📊 Unread count: ${response.data.unreadCount}`);
    
    // Show notification types
    const types = response.data.notifications.map(n => n.type);
    const uniqueTypes = [...new Set(types)];
    console.log('📋 Notification types found:', uniqueTypes);
    
  } catch (error) {
    console.error('❌ Notification retrieval test failed:', error.response?.data?.message || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Notification System Tests...\n');
  
  // Login as admin
  const token = await login('admin');
  if (!token) {
    console.log('❌ Admin login failed, cannot run tests');
    return;
  }
  
  // Run all tests
  await testLeadAssignment();
  await testPaymentCreation();
  await testAccessGrant();
  await testLeaveApplication();
  await testAdminAccessGrant();
  await testAdminPasswordChange();
  await testNotifications();
  
  console.log('\n✅ All notification tests completed!');
}

// Run the tests
runAllTests().catch(console.error); 