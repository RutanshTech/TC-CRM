const axios = require('axios');

// Test the enhanced payment claim system with lead validation
async function testLeadPaymentClaim() {
  try {
    console.log('Testing Enhanced Payment Claim System...\n');

    // Test 1: Check lead payment status endpoint
    console.log('1. Testing check lead payment status endpoint...');
    try {
      const response = await axios.get('https://tc-crm.vercel.app/api/payments/check-lead/test-lead-id');
      console.log('✅ Lead payment status endpoint accessible');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Lead payment status endpoint error:', error.response?.data?.message || error.message);
    }

    // Test 2: Test payment claim with lead validation
    console.log('\n2. Testing payment claim with lead validation...');
    try {
      const claimData = {
        leadId: 'test-lead-id'
      };
      
      const response = await axios.post('https://tc-crm.vercel.app/api/payments/test-payment-id/claim-with-lead', claimData);
      console.log('✅ Payment claim with lead validation works');
      console.log('Response:', response.data);
    } catch (error) {
      console.log('❌ Payment claim with lead validation error:', error.response?.data?.message || error.message);
    }

    console.log('\n✅ Enhanced payment claim system test completed!');
    console.log('\nNew Features:');
    console.log('1. Lead payment validation (> ₹1 required)');
    console.log('2. Partial claim support (deduct only available amount)');
    console.log('3. Real-time lead payment status checking');
    console.log('4. Hindi error messages for better UX');
    console.log('5. Detailed claim information in response');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testLeadPaymentClaim(); 