const express = require('express');
const passport = require('../config/passport');
const { generateToken, authenticateToken } = require('../middleware/auth');
const DynamoDBService = require('../services/dynamodb');

const router = express.Router();
const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');

/**
 * GET /auth/google
 * Initiate Google OAuth login
 */
router.get('/google', 
  (req, res, next) => {
    // Store mobile parameter in session to pass to callback
    if (req.query.mobile === 'true') {
      req.session.isMobile = true;
    }
    next();
  },
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

/**
 * GET /auth/google/callback
 * Google OAuth callback
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'snapevent://auth/callback'}?error=auth_failed`,
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Add debug logging
      console.log('Auth callback - Query params:', req.query);
      console.log('Auth callback - NODE_ENV:', process.env.NODE_ENV);
      
      // Redirect to our server's callback page which will then open the custom scheme
      const serverUrl = 'http://10.37.96.184.nip.io:3000';
      console.log('Redirecting to server callback page with token:', token);
      
      res.redirect(`${serverUrl}/auth/mobile-callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }))}`);
      
    } catch (error) {
      console.error('Error in auth callback:', error);
      const serverUrl = 'http://10.37.96.184.nip.io:3000';
      res.redirect(`${serverUrl}/auth/mobile-callback?error=token_generation_failed`);
    }
  }
);

/**
 * GET /auth/mobile-callback
 * Mobile app callback page that redirects to custom scheme
 */
router.get('/mobile-callback', (req, res) => {
  const { token, user, error } = req.query;
  
  if (error) {
    // Redirect to app with error
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h2>Authentication Error</h2>
          <p>Error: ${error}</p>
          <p>Redirecting to app...</p>
          <script>
            setTimeout(() => {
              window.location.href = 'snapevent://auth/callback?error=${encodeURIComponent(error)}';
            }, 1000);
          </script>
        </body>
      </html>
    `);
  } else if (token && user) {
    // Redirect to app with success
    const customSchemeUrl = `snapevent://auth/callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(user)}`;
    const expoGoUrl = `exp://10.37.96.184:8081/--/auth/callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(user)}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Success</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .button { 
              background-color: #007AFF; 
              color: white; 
              padding: 12px 24px; 
              border: none; 
              border-radius: 8px; 
              font-size: 16px; 
              cursor: pointer; 
              text-decoration: none; 
              display: inline-block; 
              margin: 10px;
            }
            .expo-button {
              background-color: #000020;
            }
          </style>
        </head>
        <body>
          <h2>Authentication Successful!</h2>
          <p>Opening SnapEvent app...</p>
          <p>If the app doesn't open automatically, click one of the buttons below:</p>
          
          <a href="${expoGoUrl}" class="button expo-button">
            Open in Expo Go
          </a>
          <a href="${customSchemeUrl}" class="button">
            Open with Custom Scheme
          </a>
          
          <script>
            // Try Expo Go URL first for development
            window.location.href = '${expoGoUrl}';
            
            // Fallback to custom scheme after delay
            setTimeout(() => {
              window.location.href = '${customSchemeUrl}';
            }, 1000);
            
            // Additional fallback
            setTimeout(() => {
              try {
                window.open('${expoGoUrl}', '_self');
              } catch(e) {
                console.log('Manual click required');
              }
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } else {
    // Missing parameters
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h2>Authentication Error</h2>
          <p>Missing authentication parameters</p>
          <p>Redirecting to app...</p>
          <script>
            setTimeout(() => {
              window.location.href = 'snapevent://auth/callback?error=missing_parameters';
            }, 1000);
          </script>
        </body>
      </html>
    `);
  }
});

/**
 * POST /auth/token/verify
 * Verify JWT token and return user info
 */
router.post('/token/verify', authenticateToken, async (req, res) => {
  try {
    // Get fresh user data from database
    const user = await usersDB.getItem({ id: req.user.googleId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          lat: user.lat,
          lng: user.lng,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        token: req.headers.authorization.split(' ')[1] // Return the same token
      },
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify token',
      message: error.message
    });
  }
});

/**
 * POST /auth/token/refresh
 * Refresh JWT token
 */
router.post('/token/refresh', authenticateToken, async (req, res) => {
  try {
    // Get fresh user data from database
    const user = await usersDB.getItem({ id: req.user.googleId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update last login
    await usersDB.updateItem(
      { id: req.user.googleId },
      'SET lastLogin = :lastLogin',
      { ':lastLogin': new Date().toISOString() }
    );

    // Generate new token
    const newToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    });

    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          lat: user.lat,
          lng: user.lng,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

/**
 * POST /auth/logout
 * Logout (client-side token invalidation)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // Note: With JWT, we can't truly invalidate tokens server-side without a blacklist
  // This endpoint is mainly for consistency and potential future blacklist implementation
  res.json({
    success: true,
    message: 'Logged out successfully. Please remove the token from client storage.'
  });
});

module.exports = router;