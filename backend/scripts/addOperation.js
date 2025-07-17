const mongoose = require('mongoose');
const Operation = require('../models/Operation');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const addTestOperation = async () => {
  try {
    // Check if operation already exists
    const existingOperation = await Operation.findOne({ email: 'operation@example.com' });
    
    if (existingOperation) {
      console.log('Test operation already exists:');
      console.log('Email: operation@example.com');
      console.log('Password: 123456');
      return;
    }

    // Create test operation
    const operation = new Operation({
      name: 'Test Operation',
      email: 'operation@example.com',
      password: '123456',
      plainPassword: '123456',
      role: 'operation',
      isActive: true,
      status: 'offline'
    });

    await operation.save();
    
    console.log('Test operation created successfully!');
    console.log('Email: operation@example.com');
    console.log('Password: 123456');
    
  } catch (error) {
    console.error('Error creating test operation:', error);
  } finally {
    mongoose.connection.close();
  }
};

addTestOperation(); 