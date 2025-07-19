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

async function testSoundNotifications() {
  try {
    console.log('\n🧪 Testing Sound Notifications...');
    
    // Login as admin first
    const adminToken = await login('admin');
    if (!adminToken) {
      console.log('❌ Admin login failed, cannot test notifications');
      return;
    }

    console.log('\n📋 Creating test notifications...');

    // Test 1: Create a payment (this should trigger notifications)
    console.log('\n📋 Test 1: Payment Creation');
    try {
      const paymentData = {
        amount: 10000,
        paymentMethod: 'cash',
        leadId: 'SOUND_TEST_001',
        leadPhoneNumber: '9876543210',
        leadCompanyName: 'Sound Test Company',
        description: 'Test payment for sound notification testing',
        receiptNumber: 'SOUND_RCPT001',
        transactionId: 'SOUND_TXN001'
      };
      
      const response = await axios.post(`${BASE_URL}/payments`, paymentData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ Payment creation test completed');
      console.log('📊 Payment result:', response.data);
      
    } catch (error) {
      console.error('❌ Payment creation test failed:', error.response?.data?.message || error.message);
    }

    // Test 2: Grant access to an employee
    console.log('\n📋 Test 2: Employee Access Grant');
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

    // Test 3: Check employee notifications
    console.log('\n📋 Test 3: Check Employee Notifications');
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
      
      // Show recent notifications
      const recentNotifications = notificationsResponse.data.notifications.slice(0, 5);
      console.log('📋 Recent notifications:');
      recentNotifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.title} (${notification.type})`);
      });
      
    } catch (error) {
      console.error('❌ Employee notification check failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎵 Sound Notification Test Instructions:');
    console.log('1. Open the notification center in the frontend');
    console.log('2. Make sure sound is enabled (🔊 icon)');
    console.log('3. Run this test script to create notifications');
    console.log('4. You should hear notification sounds when new notifications arrive');
    console.log('5. Check the browser console for any errors');

  } catch (error) {
    console.error('❌ Sound notification test failed:', error);
  }
}

async function runSoundNotificationTests() {
  console.log('🚀 Starting Sound Notification Tests...\n');
  
  await testSoundNotifications();
  
  console.log('\n✅ All sound notification tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Check the frontend notification center');
  console.log('2. Verify sound notifications are working');
  console.log('3. Test the sound toggle button');
}

// Run the tests
runSoundNotificationTests().catch(console.error); 