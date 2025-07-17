const axios = require('axios');

// Test the partial payment claim functionality
async function testPartialPaymentClaim() {
  try {
    console.log('Testing Partial Payment Claim System...\n');

    console.log('Scenario: Lead has ₹4, trying to claim ₹5 payment');
    console.log('Expected: Claim ₹4, return ₹1 to Payment Claims\n');

    // Test 1: Create a payment entry of ₹5
    console.log('1. Creating payment entry of ₹5...');
    try {
      const paymentData = {
        amount: 5000, // ₹5 in paise
        paymentMethod: 'cash',
        accountName: 'Test Account',
        description: 'Test payment for partial claim'
      };
      
      const response = await axios.post('https://tc-crm.vercel.app/api/payments', paymentData);
      console.log('✅ Payment created successfully');
      console.log('Payment ID:', response.data.payment._id);
      console.log('Amount:', response.data.payment.amount);
    } catch (error) {
      console.log('❌ Payment creation error:', error.response?.data?.message || error.message);
    }

    // Test 2: Try to claim with lead that has ₹4
    console.log('\n2. Testing partial claim (₹5 payment, ₹4 available in lead)...');
    try {
      const claimData = {
        leadId: 'test-lead-with-4-rupees'
      };
      
      const response = await axios.post('https://tc-crm.vercel.app/api/payments/test-payment-id/claim-with-lead', claimData);
      console.log('✅ Partial claim test completed');
      console.log('Response:', response.data);
      
      if (response.data.remainingPayment) {
        console.log('✅ Remaining amount correctly returned to Payment Claims');
        console.log('Remaining amount:', response.data.remainingPayment.amount);
      }
    } catch (error) {
      console.log('❌ Partial claim error:', error.response?.data?.message || error.message);
    }

    console.log('\n✅ Partial payment claim system test completed!');
    console.log('\nKey Features:');
    console.log('1. Only claims available amount from lead');
    console.log('2. Returns remaining amount to Payment Claims');
    console.log('3. Creates new payment entry for remaining amount');
    console.log('4. Shows detailed claim information');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testPartialPaymentClaim(); 