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

async function debugNotificationSystem() {
  try {
    console.log('\n🔍 Debugging Notification System...');
    
    // Login as admin first
    const adminToken = await login('admin');
    if (!adminToken) {
      console.log('❌ Admin login failed, cannot test notifications');
      return;
    }

    console.log('\n📋 Step 1: Check if notifications are being created...');

    // Test 1: Create a test notification manually
    console.log('\n📋 Test 1: Manual Notification Creation');
    try {
      // Get an employee
      const employee = await Employee.findOne({ isActive: true });
      if (!employee) {
        console.log('❌ No active employees found');
        return;
      }

      // Get admin user
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        console.log('❌ No admin user found');
        return;
      }

      console.log('✅ Found employee:', employee.name);
      console.log('✅ Found admin:', adminUser.name);

      // Create a test notification manually
      const testNotification = await Notification.create({
        title: 'Test Notification',
        message: 'This is a test notification to debug the system',
        type: 'system_alert',
        priority: 'medium',
        recipients: [employee._id],
        sender: adminUser._id,
        relatedData: {
          testData: 'debug_test'
        }
      });

      console.log('✅ Test notification created:', testNotification._id);
      console.log('📊 Notification details:', {
        title: testNotification.title,
        message: testNotification.message,
        recipients: testNotification.recipients,
        sender: testNotification.sender
      });

      // Check if notification appears in employee's notifications
      const employeeNotifications = await Notification.find({
        $or: [
          { recipients: employee._id },
          { allEmployees: true }
        ]
      }).populate('sender', 'name');

      console.log('📊 Total notifications for employee:', employeeNotifications.length);
      console.log('📋 Recent notifications:');
      employeeNotifications.slice(0, 5).forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} (${notification.type}) - ${notification.sender?.name || 'System'}`);
      });

    } catch (error) {
      console.error('❌ Manual notification creation failed:', error.message);
    }

    // Test 2: Check employee access update
    console.log('\n📋 Test 2: Employee Access Update');
    try {
      const employee = await Employee.findOne({ isActive: true });
      if (!employee) {
        console.log('❌ No active employees found');
        return;
      }

      console.log('📊 Current employee access:', employee.access);

      // Update employee access
      const newAccess = {
        ...employee.access,
        sales: true,
        leadAdd: true
      };

      const updatedEmployee = await Employee.findByIdAndUpdate(
        employee._id,
        { access: newAccess },
        { new: true }
      );

      console.log('✅ Employee access updated');
      console.log('📊 New access:', updatedEmployee.access);

      // Check if notification was created
      const accessNotifications = await Notification.find({
        type: 'access_granted',
        recipients: employee._id
      }).populate('sender', 'name');

      console.log('📊 Access notifications created:', accessNotifications.length);
      accessNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} - ${notification.sender?.name || 'System'}`);
      });

    } catch (error) {
      console.error('❌ Employee access update failed:', error.message);
    }

    // Test 3: Check payment creation
    console.log('\n📋 Test 3: Payment Creation');
    try {
      const paymentData = {
        amount: 5000,
        paymentMethod: 'cash',
        leadId: 'DEBUG_TEST_001',
        leadPhoneNumber: '9876543210',
        leadCompanyName: 'Debug Test Company',
        description: 'Test payment for debugging',
        receiptNumber: 'DEBUG_RCPT001',
        transactionId: 'DEBUG_TXN001'
      };

      const response = await axios.post(`${BASE_URL}/payments`, paymentData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      console.log('✅ Payment creation test completed');
      console.log('📊 Payment result:', response.data);

      // Check if notifications were created
      const paymentNotifications = await Notification.find({
        type: { $in: ['payment_created', 'payment_claim'] }
      }).populate('sender', 'name');

      console.log('📊 Payment notifications created:', paymentNotifications.length);
      paymentNotifications.slice(0, 3).forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} (${notification.type}) - ${notification.sender?.name || 'System'}`);
      });

    } catch (error) {
      console.error('❌ Payment creation test failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Check employee notifications via API
    console.log('\n📋 Test 4: Employee Notifications via API');
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
      });

    } catch (error) {
      console.error('❌ Employee notification check failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🔍 Debug Summary:');
    console.log('1. Check if notifications are being created in database');
    console.log('2. Check if notifications are being sent to employees');
    console.log('3. Check if frontend is receiving notifications');
    console.log('4. Check if sound notifications are working');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

async function runDebugTests() {
  console.log('🚀 Starting Notification System Debug...\n');
  
  await debugNotificationSystem();
  
  console.log('\n✅ Debug tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check the console output above for any errors');
  console.log('2. Verify notifications are being created in database');
  console.log('3. Test the frontend notification center');
  console.log('4. Check if sound notifications are working');
}

// Run the debug tests
runDebugTests().catch(console.error); 