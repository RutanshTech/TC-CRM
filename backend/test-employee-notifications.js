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

async function testEmployeeNotifications() {
  try {
    console.log('\n🧪 Testing Employee Notifications...');
    
    // Login as admin first
    const adminToken = await login('admin');
    if (!adminToken) {
      console.log('❌ Admin login failed, cannot test employee notifications');
      return;
    }

    // Test 1: Lead Assignment Notification
    console.log('\n📋 Test 1: Lead Assignment Notification');
    try {
      // Get employees for lead distribution
      const employeesResponse = await axios.get(`${BASE_URL}/employees/for-lead-distribution`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (employeesResponse.data.length === 0) {
        console.log('⚠️ No employees available for testing');
        return;
      }
      
      // Get some leads
      const leadsResponse = await axios.get(`${BASE_URL}/leads`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (leadsResponse.data.length === 0) {
        console.log('⚠️ No leads available for testing');
        return;
      }
      
      // Assign leads to employees
      const leadIds = [leadsResponse.data[0]._id];
      const employeeIds = [employeesResponse.data[0]._id];
      
      const assignmentResponse = await axios.post(`${BASE_URL}/leads/assign`, {
        leadIds,
        employeeIds
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ Lead assignment test completed');
      console.log('📊 Assignment result:', assignmentResponse.data);
      
    } catch (error) {
      console.error('❌ Lead assignment test failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Payment Creation Notification
    console.log('\n📋 Test 2: Payment Creation Notification');
    try {
      const paymentData = {
        amount: 5000,
        paymentMethod: 'cash',
        leadId: 'TEST_LEAD_001',
        leadPhoneNumber: '9876543210',
        leadCompanyName: 'Test Company',
        description: 'Test payment for employee notification testing',
        receiptNumber: 'RCPT001',
        transactionId: 'TXN001'
      };
      
      const response = await axios.post(`${BASE_URL}/payments`, paymentData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ Payment creation test completed');
      console.log('📊 Payment result:', response.data);
      
    } catch (error) {
      console.error('❌ Payment creation test failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Employee Access Grant Notification
    console.log('\n📋 Test 3: Employee Access Grant Notification');
    try {
      // Get an employee
      const employeesResponse = await axios.get(`${BASE_URL}/employees`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (employeesResponse.data.length === 0) {
        console.log('⚠️ No employees available for testing');
        return;
      }
      
      const employeeId = employeesResponse.data[0].employeeId;
      
      // Grant access to employee
      const accessData = {
        access: {
          sales: true,
          leadAdd: true,
          paymentView: true
        }
      };
      
      const response = await axios.patch(`${BASE_URL}/employees/${employeeId}/access`, accessData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ Employee access grant test completed');
      console.log('📊 Access result:', response.data);
      
    } catch (error) {
      console.error('❌ Employee access grant test failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Leave Application and Response Notification
    console.log('\n📋 Test 4: Leave Application and Response Notification');
    try {
      // Login as employee
      const employeeToken = await login('employee');
      if (!employeeToken) {
        console.log('⚠️ Employee login failed, skipping leave test');
        return;
      }
      
      // Get employee info
      const employeeResponse = await axios.get(`${BASE_URL}/employees`, {
        headers: { Authorization: `Bearer ${employeeToken}` }
      });
      
      if (employeeResponse.data.length === 0) {
        console.log('⚠️ No employees available for testing');
        return;
      }
      
      const employeeId = employeeResponse.data[0].employeeId;
      
      // Apply for leave
      const leaveData = {
        startDate: '2024-02-20',
        endDate: '2024-02-21',
        reason: 'Test leave application for notification testing'
      };
      
      const leaveResponse = await axios.post(`${BASE_URL}/employees/${employeeId}/leave`, leaveData, {
        headers: { Authorization: `Bearer ${employeeToken}` }
      });
      
      console.log('✅ Leave application test completed');
      console.log('📊 Leave result:', leaveResponse.data);
      
      // Now login as admin and approve the leave
      await login('admin');
      
      // Get the leave applications
      const approvalsResponse = await axios.get(`${BASE_URL}/employees/approvals`, {
        headers: { Authorization: `Bearer ${adminToken}` }
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
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log('✅ Leave approval test completed');
        console.log('📊 Approval result:', approvalResponse.data);
      }
      
    } catch (error) {
      console.error('❌ Leave application test failed:', error.response?.data?.message || error.message);
    }

    // Test 5: Check Employee Notifications
    console.log('\n📋 Test 5: Check Employee Notifications');
    try {
      // Login as employee to check notifications
      const employeeToken = await login('employee');
      if (!employeeToken) {
        console.log('⚠️ Employee login failed, cannot check notifications');
        return;
      }
      
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${employeeToken}` }
      });
      
      console.log('✅ Employee notifications retrieved successfully');
      console.log(`📊 Total notifications: ${notificationsResponse.data.notifications.length}`);
      console.log(`📊 Unread count: ${notificationsResponse.data.unreadCount}`);
      
      // Show notification types
      const types = notificationsResponse.data.notifications.map(n => n.type);
      const uniqueTypes = [...new Set(types)];
      console.log('📋 Notification types found:', uniqueTypes);
      
      // Show recent notifications
      const recentNotifications = notificationsResponse.data.notifications.slice(0, 5);
      console.log('📋 Recent notifications:');
      recentNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} (${notification.type})`);
      });
      
    } catch (error) {
      console.error('❌ Employee notification check failed:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Employee notification test failed:', error);
  }
}

async function runEmployeeNotificationTests() {
  console.log('🚀 Starting Employee Notification Tests...\n');
  
  await testEmployeeNotifications();
  
  console.log('\n✅ All employee notification tests completed!');
}

// Run the tests
runEmployeeNotificationTests().catch(console.error); 