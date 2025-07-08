const mongoose = require('mongoose');
const PaymentCollection = require('../models/PaymentCollection');

// TODO: Replace with your actual MongoDB connection string
const MONGO_URI = 'mongodb://localhost:27017/<YOUR_DB_NAME>';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function cleanBadPayments() {
  try {
    const result = await PaymentCollection.deleteMany({
      $or: [
        { amount: { $exists: false } },
        { amount: { $type: 'string' } },
        { amount: null }
      ]
    });
    console.log('Deleted bad payment documents:', result.deletedCount);
  } catch (err) {
    console.error('Error cleaning payments:', err);
  } finally {
    mongoose.disconnect();
  }
}

cleanBadPayments(); 