const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const User = require('./models/User');
const bcrypt = require('bcrypt');
require('./utils/cronJobs');
const http = require('http');
const { Server } = require('socket.io');
const fileUpload = require('express-fileupload');

// Load env
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const operationRoutes = require('./routes/operationRoutes');

// DB connection
require('./config/db');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api', adminRoutes);
app.use('/api', employeeRoutes);
app.use('/api', paymentRoutes);
app.use('/api', notificationRoutes);
app.use('/api', operationRoutes);

// After all app.use() for routes, print all registered routes
app._router && app._router.stack.forEach(r => {
  if (r.route && r.route.path) {
    console.log('Registered route:', r.route.path);
  }
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*', // You can restrict this to your frontend URL
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Make io accessible in controllers
app.set('io', io);

// Ensure Super Admin exists and then start server
const startServer = async () => {
  try {
    const email = 'S.A@TMC.in';
    const password = 'TMCR.24@25';
    const existing = await User.findOne({ email });
    if (!existing) {
      const hash = await bcrypt.hash(password, 10);
      await User.create({
        name: 'Super Admin',
        email,
        password: hash,
        role: 'super-admin',
        isActive: true,
        adminAccess: {
          employee: true,
          sales: true,
          operation: true,
          advocate: true,
          allThings: true
        }
      });
      console.log('Super Admin user created: S.A@TMC.in / TMCR.24@25');
    } else {
      console.log('Super Admin user already exists.');
    }

    // Server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error ensuring Super Admin user:', err);
  }
};

startServer();
