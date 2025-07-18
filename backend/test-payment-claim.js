const axios = require('axios');

// Test the payment claim system
async function testPaymentClaim() {
  try {
    console.log('Testing Payment Claim System...\n');

    // Test 1: Get available payments (should require authentication)
    console.log('1. Testing get available payments endpoint...');
    try {
      const response = await axios.get('tc-crm.vercel.app/api/payments/available');
      console.log('✅ Available payments endpoint accessible');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Available payments endpoint error:', error.response?.data?.message || error.message);
    }

    // Test 2: Create a payment entry (admin function)
    console.log('\n2. Testing payment creation...');
    try {
      const paymentData = {
        amount: 3000,
        paymentMethod: 'cash',
        accountName: 'Test Account',
        description: 'Test payment for claim system'
      };
      
      const response = await axios.post('tc-crm.vercel.app/api/payments', paymentData);
      console.log('✅ Payment created successfully');
      console.log('Payment ID:', response.data.payment._id);
    } catch (error) {
      console.log('❌ Payment creation error:', error.response?.data?.message || error.message);
    }

    console.log('\n✅ Payment claim system test completed!');
    console.log('\nTo test the complete flow:');
    console.log('1. Login as admin/super-admin and create payment entries');
    console.log('2. Login as employee and go to the Claim page');
    console.log('3. Select a payment and claim it with a lead ID');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testPaymentClaim(); 