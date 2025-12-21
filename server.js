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
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://fcb-hyderabad-frontend.vercel.app',
      'https://fcb-hyderabad-frontend-goxyrosr9-tejasvisjains-projects.vercel.app'
    ];
    
    // Allow all Vercel preview deployments
    if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route (before other routes)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: '🔵🔴 Visca el Barça! Backend is running',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJWT: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Debug route to show registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Routes (wrapped in try-catch for better error handling)
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/blogs', require('./routes/blogs'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/bookings', require('./routes/bookings'));
  app.use('/api/seat-locks', require('./routes/seatLocks'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error);
}

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
  console.error('Error occurred:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
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
