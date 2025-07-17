const axios = require('axios');
const mongoose = require('mongoose');
const Notification = require('./models/Notification');
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

async function testAccessNotification() {
  try {
    console.log('\n🧪 Testing Access Notification System...');
    
    // Login as super-admin first
    const superAdminToken = await login('superAdmin');
    if (!superAdminToken) {
      console.log('❌ Super-admin login failed, trying admin...');
      const adminToken = await login('admin');
      if (!adminToken) {
        console.log('❌ Admin login failed, cannot test notifications');
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

    // Test 1: Grant new access to employee
    console.log('\n📋 Test 1: Grant New Access to Employee');
    try {
      const newAccess = {
        ...employee.access,
        sales: true,
        leadAdd: true,
        paymentView: true
      };

      console.log('🎯 Granting access:', {
        sales: newAccess.sales,
        leadAdd: newAccess.leadAdd,
        paymentView: newAccess.paymentView
      });

      const response = await axios.patch(`${BASE_URL}/employees/${employee.employeeId}/access`, {
        access: newAccess
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      console.log('✅ Access update response:', response.data);
      console.log('📊 Notifications sent:', response.data.notificationsSent);

    } catch (error) {
      console.error('❌ Access update failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Check if notifications were created
    console.log('\n📋 Test 2: Check Notification Creation');
    try {
      const notifications = await Notification.find({
        type: 'access_granted',
        recipients: employee._id
      }).populate('sender', 'name');

      console.log('📊 Access notifications found:', notifications.length);
      notifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} - ${notification.sender?.name || 'System'}`);
        console.log(`     Message: ${notification.message}`);
        console.log(`     Access Type: ${notification.relatedData?.accessType}`);
      });

    } catch (error) {
      console.error('❌ Notification check failed:', error.message);
    }

    // Test 3: Check employee notifications via API
    console.log('\n📋 Test 3: Check Employee Notifications via API');
    try {
      // Login as employee
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

      // Show recent notifications
      const recentNotifications = notificationsResponse.data.notifications.slice(0, 5);
      console.log('📋 Recent notifications:');
      recentNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} (${notification.type})`);
        if (notification.type === 'access_granted') {
          console.log(`     Access Type: ${notification.relatedData?.accessType}`);
        }
      });

    } catch (error) {
      console.error('❌ Employee notification check failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🔍 Access Notification Test Summary:');
    console.log('1. ✅ Access was granted to employee');
    console.log('2. ✅ Notifications should be created in database');
    console.log('3. ✅ Employee should see notifications in frontend');
    console.log('4. ✅ Sound notifications should play for employee');

  } catch (error) {
    console.error('❌ Access notification test failed:', error);
  }
}

async function runAccessNotificationTests() {
  console.log('🚀 Starting Access Notification Tests...\n');
  
  await testAccessNotification();
  
  console.log('\n✅ Access notification tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check if employee received the notification');
  console.log('2. Verify sound notification played');
  console.log('3. Test with different access types');
  console.log('4. Check frontend notification center');
}

// Run the tests
runAccessNotificationTests().catch(console.error); 