require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

// Import DynamoDB service for testing
const DynamoDBService = require('./services/dynamodb');

// Import routes
const eventsRoutes = require('./routes/events');
const usersRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const directionsRoutes = require('./routes/directions');

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    `http://${process.env.IP_ADDRESS}:8081`, // Expo development server
    `exp://${process.env.IP_ADDRESS}:8081`   // Expo scheme
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/directions', directionsRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to SnapEvent API',
    status: 'Server is running successfully'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Test DynamoDB connection endpoint
app.get('/test-db', async (req, res) => {
  try {
    console.log('Testing DynamoDB connection...');
    
    // Initialize test services
    const eventsDB = new DynamoDBService(process.env.EVENTS_TABLE || 'snapevent-events');
    const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tables: {},
      status: 'success'
    };

    // Test Events table
    try {
      const events = await eventsDB.scanTable(null, null, 5); // Limit to 5 items
      testResults.tables.events = {
        status: 'connected',
        tableName: process.env.EVENTS_TABLE || 'snapevent-events',
        itemCount: events.length,
        sample: events.length > 0 ? events[0] : null
      };
    } catch (error) {
      testResults.tables.events = {
        status: 'error',
        tableName: process.env.EVENTS_TABLE || 'snapevent-events',
        error: error.message
      };
    }

    // Test Users table
    try {
      const users = await usersDB.scanTable(null, null, 5); // Limit to 5 items
      testResults.tables.users = {
        status: 'connected',
        tableName: process.env.USERS_TABLE || 'snapevent-users',
        itemCount: users.length,
        sample: users.length > 0 ? users[0] : null
      };
    } catch (error) {
      testResults.tables.users = {
        status: 'error',
        tableName: process.env.USERS_TABLE || 'snapevent-users',
        error: error.message
      };
    }

    // Check if any table had errors
    const hasErrors = Object.values(testResults.tables).some(table => table.status === 'error');
    if (hasErrors) {
      testResults.status = 'partial';
      res.status(207).json(testResults); // 207 Multi-Status
    } else {
      res.status(200).json(testResults);
    }

  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Failed to test database connection'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: 'Internal server error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see the API`);
  console.log(`Network access: http://${process.env.IP_ADDRESS}:${PORT}`);
});