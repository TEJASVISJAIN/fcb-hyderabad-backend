const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Start cleanup job for seat locks (only in non-serverless environment)
if (!process.env.VERCEL) {
  require('./jobs/cleanupLocks');
}

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://fcb-hyderabad-frontend.vercel.app',
    'https://fcb-hyderabad-frontend-r1hpdhodn-tejasvisjains-projects.vercel.app',
    /\.vercel\.app$/ // Allow all Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/seat-locks', require('./routes/seatLocks'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    message: '🔵🔴 Visca el Barça! Welcome to the Hyderabad Peña API 🔴🔵',
    endpoints: {
      auth: '/api/auth',
      blogs: '/api/blogs'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// For Vercel serverless deployment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For local development
  app.listen(PORT, () => {
    console.log(`🔵🔴 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log('Visca el Barça! 🔴🔵');
  });
}
