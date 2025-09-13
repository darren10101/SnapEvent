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
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`,
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Redirect to client with token
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }))}`);
    } catch (error) {
      console.error('Error in auth callback:', error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/login?error=token_generation_failed`);
    }
  }
);

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