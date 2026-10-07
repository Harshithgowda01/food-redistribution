const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Import all models (registers them with mongoose)
require('./models/User.model');
require('./models/Donor.model');
require('./models/NGO.model');
require('./models/Volunteer.model');
require('./models/Donation.model');
require('./models/Delivery.model');
require('./models/Notification.model');
require('./models/MatchingLog.model');

// Import routes
const authRoutes = require('./routes/auth.routes');
const donorRoutes = require('./routes/donor.routes');
const ngoRoutes = require('./routes/ngo.routes');
const volunteerRoutes = require('./routes/volunteer.routes');
const donationRoutes = require('./routes/donation.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');

// Import background jobs
const { startTimeoutChecker } = require('./jobs/timeoutChecker');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Food Redistribution Platform API is running',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0',() => {
      console.log(`Backend server running on port ${PORT}`);
      startTimeoutChecker();
      console.log('Background timeout checker started (every 30 seconds)');
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });