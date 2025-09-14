const express = require('express');
const DynamoDBService = require('../services/dynamodb');
const GoogleDirectionsService = require('../services/googleDirections');
const { authenticateToken, requireOwnership, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Initialize DynamoDB service for users table
const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');

// Initialize Google Directions service
const directionsService = new GoogleDirectionsService();

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (req, res) => {
  try {
    const users = await usersDB.scanTable();
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:googleId
 * Get a specific user by Google ID
 */
router.get('/:googleId', async (req, res) => {
  try {
    const { googleId } = req.params;
    const user = await usersDB.getItem({ id: googleId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error.message
    });
  }
});

/**
 * GET /api/users/email/:email
 * Get a user by email address (useful for Google Auth lookups)
 */
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Since we don't have a GSI on email yet, we'll scan the table
    // In production, you should create a GSI on email for better performance
    const users = await usersDB.scanTable('email = :email', { ':email': email }, 1);
    
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user by email',
      message: error.message
    });
  }
});

/**
 * POST /api/users
 * Create a new user (typically called after Google OAuth)
 */
router.post('/', async (req, res) => {
  try {
    const { googleId, email, name, picture, lat, lng, availability, friends, transportModes } = req.body;
    
    // Basic validation
    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'googleId, email, and name are required'
      });
    }

    // Validate transport modes if provided
    const validTransportModes = ['walking', 'driving', 'transit', 'bicycling'];
    let userTransportModes = ['driving']; // Default to driving
    
    if (transportModes && Array.isArray(transportModes)) {
      const filteredModes = transportModes.filter(mode => validTransportModes.includes(mode));
      if (filteredModes.length > 0) {
        userTransportModes = [...new Set(filteredModes)]; // Remove duplicates
      }
    }

    // Check if user already exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        data: existingUser
      });
    }
    
    const newUser = {
      id: googleId, // Using Google ID as primary key
      email,
      name,
      picture: picture || null,
      lat: lat !== undefined ? parseFloat(lat) : null,
      lng: lng !== undefined ? parseFloat(lng) : null,
      availability: availability || [],
      friends: friends || [],
      transportModes: userTransportModes,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await usersDB.putItem(newUser);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:googleId
 * Update an existing user
 */
router.put('/:googleId', async (req, res) => {
  try {
    const { googleId } = req.params;
    const { name, picture, lat, lng, availability, friends, transportModes } = req.body;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Build update expression
    let updateExpression = 'SET lastLogin = :lastLogin';
    const expressionAttributeValues = {
      ':lastLogin': new Date().toISOString()
    };
    const expressionAttributeNames = {};
    const updateParts = ['lastLogin = :lastLogin'];

    if (name) {
      updateParts.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }
    
    if (picture !== undefined) {
      updateParts.push('picture = :picture');
      expressionAttributeValues[':picture'] = picture;
    }
    
    if (lat !== undefined) {
      updateParts.push('lat = :lat');
      expressionAttributeValues[':lat'] = parseFloat(lat);
    }
    
    if (lng !== undefined) {
      updateParts.push('lng = :lng');
      expressionAttributeValues[':lng'] = parseFloat(lng);
    }
    
    if (availability) {
      updateParts.push('availability = :availability');
      expressionAttributeValues[':availability'] = availability;
    }
    
    if (friends) {
      updateParts.push('friends = :friends');
      expressionAttributeValues[':friends'] = friends;
    }

    if (transportModes) {
      // Validate transport modes
      const validTransportModes = ['walking', 'driving', 'transit', 'bicycling'];
      let userTransportModes = transportModes;
      
      if (Array.isArray(transportModes)) {
        const filteredModes = transportModes.filter(mode => validTransportModes.includes(mode));
        userTransportModes = filteredModes.length > 0 ? [...new Set(filteredModes)] : ['driving'];
      } else {
        userTransportModes = ['driving']; // Default fallback
      }
      
      updateParts.push('transportModes = :transportModes');
      expressionAttributeValues[':transportModes'] = userTransportModes;
    }

    updateExpression = `SET ${updateParts.join(', ')}`;

    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      updateExpression,
      expressionAttributeValues,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error.message
    });
  }
});

/**
 * DELETE /api/users/:googleId
 * Delete a user
 */
router.delete('/:googleId', async (req, res) => {
  try {
    const { googleId } = req.params;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await usersDB.deleteItem({ id: googleId });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:googleId/location
 * Update user's current location (requires authentication and ownership)
 */
router.put('/:googleId/location', authenticateToken, requireOwnership, async (req, res) => {
  try {
    const { googleId } = req.params;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Both lat and lng are required'
      });
    }

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      'SET lat = :lat, lng = :lng, lastLogin = :lastLogin',
      { 
        ':lat': parseFloat(lat),
        ':lng': parseFloat(lng),
        ':lastLogin': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location',
      message: error.message
    });
  }
});

/**
 * POST /api/users/:googleId/availability
 * Add availability window for a user (requires authentication and ownership)
 */
router.post('/:googleId/availability', authenticateToken, requireOwnership, async (req, res) => {
  try {
    const { googleId } = req.params;
    const { start, end, location } = req.body;

    if (!start || !end || !location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'start, end, and location (with lat/lng) are required'
      });
    }

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const newAvailability = {
      start,
      end,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      }
    };

    // Add to existing availability array
    const currentAvailability = existingUser.availability || [];
    const updatedAvailability = [...currentAvailability, newAvailability];

    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      'SET availability = :availability, lastLogin = :lastLogin',
      { 
        ':availability': updatedAvailability,
        ':lastLogin': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Availability added successfully'
    });
  } catch (error) {
    console.error('Error adding availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add availability',
      message: error.message
    });
  }
});

/**
 * DELETE /api/users/:googleId/availability/:index
 * Remove specific availability window by index
 */
router.delete('/:googleId/availability/:index', async (req, res) => {
  try {
    const { googleId, index } = req.params;
    const availabilityIndex = parseInt(index);

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentAvailability = existingUser.availability || [];
    
    if (availabilityIndex < 0 || availabilityIndex >= currentAvailability.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid availability index'
      });
    }

    // Remove the availability at the specified index
    const updatedAvailability = currentAvailability.filter((_, i) => i !== availabilityIndex);

    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      'SET availability = :availability, lastLogin = :lastLogin',
      { 
        ':availability': updatedAvailability,
        ':lastLogin': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Availability removed successfully'
    });
  } catch (error) {
    console.error('Error removing availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove availability',
      message: error.message
    });
  }
});

/**
 * POST /api/users/:googleId/friends
 * Add friends to a user
 */
router.post('/:googleId/friends', async (req, res) => {
  try {
    const { googleId } = req.params;
    const { friendIds } = req.body;

    if (!friendIds || !Array.isArray(friendIds)) {
      return res.status(400).json({
        success: false,
        error: 'friendIds must be an array of Google IDs'
      });
    }

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add new friends to existing ones (avoiding duplicates)
    const currentFriends = existingUser.friends || [];
    const newFriends = [...new Set([...currentFriends, ...friendIds])];

    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      'SET friends = :friends, lastLogin = :lastLogin',
      { 
        ':friends': newFriends,
        ':lastLogin': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Friends added successfully'
    });
  } catch (error) {
    console.error('Error adding friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add friends',
      message: error.message
    });
  }
});

/**
 * DELETE /api/users/:googleId/friends/:friendGoogleId
 * Remove a friend from user's friends list
 */
router.delete('/:googleId/friends/:friendGoogleId', async (req, res) => {
  try {
    const { googleId, friendGoogleId } = req.params;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentFriends = existingUser.friends || [];
    const updatedFriends = currentFriends.filter(fId => fId !== friendGoogleId);

    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      'SET friends = :friends, lastLogin = :lastLogin',
      { 
        ':friends': updatedFriends,
        ':lastLogin': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove friend',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:googleId/friends
 * Get user's friends with their details
 */
router.get('/:googleId/friends', async (req, res) => {
  try {
    const { googleId } = req.params;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const friendIds = existingUser.friends || [];
    
    if (friendIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    // Get friend details (this could be optimized with batch get)
    const friendsPromises = friendIds.map(friendId => usersDB.getItem({ id: friendId }));
    const friends = await Promise.all(friendsPromises);
    
    // Filter out any null results (in case some friend IDs don't exist)
    const validFriends = friends.filter(friend => friend !== null);

    res.json({
      success: true,
      data: validFriends,
      count: validFriends.length
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friends',
      message: error.message
    });
  }
});

/**
 * POST /api/users/:googleId/friend-request
 * Send a friend request to a user by email
 */
router.post('/:googleId/friend-request', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if requesting user exists
    const requestingUser = await usersDB.getItem({ id: googleId });
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        error: 'Requesting user not found'
      });
    }

    // Find target user by email
    const allUsers = await usersDB.scanTable();
    const targetUser = allUsers.find(user => user.email === email);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User with this email not found'
      });
    }

    // Check if they're already friends
    const currentFriends = targetUser.friends || [];
    if (currentFriends.includes(googleId)) {
      return res.status(400).json({
        success: false,
        error: 'You are already friends with this user'
      });
    }

    // Check if friend request already exists
    const currentFriendRequests = targetUser.friendRequests || [];
    const existingRequest = currentFriendRequests.find(req => req.from === googleId);
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Friend request already sent to this user'
      });
    }

    // Add friend request to target user
    const newFriendRequest = {
      id: Math.random().toString(36).slice(2, 15),
      from: googleId,
      fromName: requestingUser.name,
      fromEmail: requestingUser.email,
      fromPicture: requestingUser.picture,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const updatedFriendRequests = [...currentFriendRequests, newFriendRequest];

    // Add sent request to requesting user
    const currentSentRequests = requestingUser.sentFriendRequests || [];
    const newSentRequest = {
      id: newFriendRequest.id, // Same ID to link them
      to: targetUser.id,
      toName: targetUser.name,
      toEmail: targetUser.email,
      toPicture: targetUser.picture,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const updatedSentRequests = [...currentSentRequests, newSentRequest];

    // Update both users in parallel
    await Promise.all([
      // Update target user with received friend request
      usersDB.updateItem(
        { id: targetUser.id },
        'SET friendRequests = :friendRequests',
        { 
          ':friendRequests': updatedFriendRequests
        }
      ),
      // Update requesting user with sent friend request
      usersDB.updateItem(
        { id: googleId },
        'SET sentFriendRequests = :sentFriendRequests',
        { 
          ':sentFriendRequests': updatedSentRequests
        }
      )
    ]);

    res.json({
      success: true,
      message: `Friend request sent to ${targetUser.name}`,
      data: {
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email
        },
        requestId: newFriendRequest.id
      }
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send friend request',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:googleId/friend-requests
 * Get friend requests for a user (both sent and received)
 */
router.get('/:googleId/friend-requests', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;

    // Get user data
    const user = await usersDB.getItem({ id: googleId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const receivedRequests = user.friendRequests || [];
    const sentRequests = user.sentFriendRequests || [];

    res.json({
      success: true,
      data: {
        received: receivedRequests,
        sent: sentRequests
      }
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friend requests',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:googleId/friend-requests/:requestId
 * Accept or decline a friend request
 */
router.put('/:googleId/friend-requests/:requestId', authenticateToken, async (req, res) => {
  try {
    const { googleId, requestId } = req.params;
    const { action } = req.body; // 'accept' or 'decline' or 'cancel'

    if (!['accept', 'decline', 'cancel'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "accept", "decline" or "cancel"'
      });
    }

    // Get the user performing the action
    const user = await usersDB.getItem({ id: googleId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // If cancelling a sent request
    if (action === 'cancel') {
      const sentRequests = user.sentFriendRequests || [];
      const sentIndex = sentRequests.findIndex(req => req.id === requestId);
      if (sentIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Sent friend request not found'
        });
      }

      const sentRequest = sentRequests[sentIndex];
      const targetUserId = sentRequest.to;
      const targetUser = await usersDB.getItem({ id: targetUserId });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: 'Target user not found'
        });
      }

      // Remove from sender's sent requests and target's received requests
      const updatedSent = sentRequests.filter(req => req.id !== requestId);
      const targetReceived = (targetUser.friendRequests || []).filter(req => req.id !== requestId);

      await Promise.all([
        usersDB.updateItem(
          { id: googleId },
          'SET sentFriendRequests = :sentFriendRequests',
          { ':sentFriendRequests': updatedSent }
        ),
        usersDB.updateItem(
          { id: targetUserId },
          'SET friendRequests = :friendRequests',
          { ':friendRequests': targetReceived }
        )
      ]);

      return res.json({
        success: true,
        message: 'Friend request cancelled',
        action: 'cancelled'
      });
    }

    // From here on, handle received requests for accept/decline
    const friendRequests = user.friendRequests || [];
    const requestIndex = friendRequests.findIndex(req => req.id === requestId);

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Friend request not found'
      });
    }

    const friendRequest = friendRequests[requestIndex];
    const requestingUserId = friendRequest.from;

    // Get the requesting user
    const requestingUser = await usersDB.getItem({ id: requestingUserId });
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        error: 'Requesting user not found'
      });
    }

    if (action === 'accept') {
      // Add each user to the other's friends list
      const currentUserFriends = user.friends || [];
      const requestingUserFriends = requestingUser.friends || [];

      const updatedCurrentUserFriends = [...new Set([...currentUserFriends, requestingUserId])];
      const updatedRequestingUserFriends = [...new Set([...requestingUserFriends, googleId])];

      // Remove the friend request from both users
      const updatedFriendRequests = friendRequests.filter(req => req.id !== requestId);
      const requestingUserSentRequests = requestingUser.sentFriendRequests || [];
      const updatedSentRequests = requestingUserSentRequests.filter(req => req.id !== requestId);

      // Update both users
      await Promise.all([
        // Update current user: add friend, remove received request
        usersDB.updateItem(
          { id: googleId },
          'SET friends = :friends, friendRequests = :friendRequests',
          { 
            ':friends': updatedCurrentUserFriends,
            ':friendRequests': updatedFriendRequests
          }
        ),
        // Update requesting user: add friend, remove sent request
        usersDB.updateItem(
          { id: requestingUserId },
          'SET friends = :friends, sentFriendRequests = :sentFriendRequests',
          { 
            ':friends': updatedRequestingUserFriends,
            ':sentFriendRequests': updatedSentRequests
          }
        )
      ]);

      res.json({
        success: true,
        message: `You are now friends with ${friendRequest.fromName}`,
        action: 'accepted'
      });
    } else {
      // Decline: just remove the requests from both users
      const updatedFriendRequests = friendRequests.filter(req => req.id !== requestId);
      const requestingUserSentRequests = requestingUser.sentFriendRequests || [];
      const updatedSentRequests = requestingUserSentRequests.filter(req => req.id !== requestId);

      await Promise.all([
        // Remove received request
        usersDB.updateItem(
          { id: googleId },
          'SET friendRequests = :friendRequests',
          { 
            ':friendRequests': updatedFriendRequests
          }
        ),
        // Remove sent request
        usersDB.updateItem(
          { id: requestingUserId },
          'SET sentFriendRequests = :sentFriendRequests',
          { 
            ':sentFriendRequests': updatedSentRequests
          }
        )
      ]);

      res.json({
        success: true,
        message: `Friend request from ${friendRequest.fromName} declined`,
        action: 'declined'
      });
    }
  } catch (error) {
    console.error('Error processing friend request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process friend request',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:googleId/transport-settings
 * Get user's transportation mode preferences
 */
router.get('/:googleId/transport-settings', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;
    
    // Get user data
    const user = await usersDB.getItem({ id: googleId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return transport modes or default to driving
    const transportModes = user.transportModes || ['driving'];

    res.json({
      success: true,
      data: {
        transportModes,
        primaryMode: transportModes[0] || 'driving'
      }
    });
  } catch (error) {
    console.error('Error fetching transport settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transport settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:googleId/transport-settings
 * Update user's transportation mode preferences
 */
router.put('/:googleId/transport-settings', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;
    const { transportModes } = req.body;

    // Validate input
    if (!transportModes || !Array.isArray(transportModes) || transportModes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'transportModes must be a non-empty array'
      });
    }

    // Validate transport modes
    const validTransportModes = ['walking', 'driving', 'transit', 'bicycling'];
    const filteredModes = transportModes.filter(mode => validTransportModes.includes(mode));
    
    if (filteredModes.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid transport modes. Valid options: ${validTransportModes.join(', ')}`
      });
    }

    // Remove duplicates
    const uniqueModes = [...new Set(filteredModes)];

    // Check if user exists
    const existingUser = await usersDB.getItem({ id: googleId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update transport modes
    const updatedAttributes = await usersDB.updateItem(
      { id: googleId },
      'SET transportModes = :transportModes, lastLogin = :lastLogin',
      {
        ':transportModes': uniqueModes,
        ':lastLogin': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: {
        transportModes: uniqueModes,
        primaryMode: uniqueModes[0]
      },
      message: 'Transport settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating transport settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transport settings',
      message: error.message
    });
  }
});

/**
 * POST /api/users/:googleId/travel-time
 * Calculate travel time from current user to another user using user's enabled transport modes
 * Body: { targetUserId }
 */
router.post('/:googleId/travel-time', authenticateToken, requireOwnership, async (req, res) => {
  try {
    const { googleId } = req.params;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }

    // Get current user location
    const currentUser = await usersDB.getItem({ id: googleId });
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Current user not found'
      });
    }

    console.log('Current user data:', currentUser);

    // Check if current user has location data
    const currentLat = currentUser.latitude || currentUser.lat;
    const currentLng = currentUser.longitude || currentUser.lng;
    
    if (!currentLat || !currentLng) {
      return res.status(400).json({
        success: false,
        error: 'Current user location not available',
        debug: {
          latitude: currentUser.latitude,
          longitude: currentUser.longitude,
          lat: currentUser.lat,
          lng: currentUser.lng
        }
      });
    }

    // Get target user location
    const targetUser = await usersDB.getItem({ id: targetUserId });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Target user not found'
      });
    }

    console.log('Target user data:', targetUser);

    // Check if target user has location data
    const targetLat = targetUser.latitude || targetUser.lat;
    const targetLng = targetUser.longitude || targetUser.lng;
    
    if (!targetLat || !targetLng) {
      return res.status(400).json({
        success: false,
        error: 'Target user location not available',
        debug: {
          latitude: targetUser.latitude,
          longitude: targetUser.longitude,
          lat: targetUser.lat,
          lng: targetUser.lng
        }
      });
    }

    const origin = `${currentLat},${currentLng}`;
    const destination = `${targetLat},${targetLng}`;

    // Get user's enabled transport modes from their profile settings
    let userTransportModes = ['driving']; // Default fallback
    
    try {
      if (currentUser.transportModes && Array.isArray(currentUser.transportModes)) {
        userTransportModes = currentUser.transportModes;
      }
      
      console.log('User transport modes from profile:', userTransportModes);
      
      // Validate that we have at least one transport mode
      if (userTransportModes.length === 0) {
        userTransportModes = ['driving']; // Fallback to driving if no modes enabled
      }
    } catch (error) {
      console.error('Error reading user transport settings:', error);
      userTransportModes = ['driving']; // Fallback on error
    }
    
    // Calculate travel time for each enabled transport mode
    const travelOptions = [];
    
    for (const mode of userTransportModes) {
      try {
        const result = await directionsService.getDirections({
          origin,
          destination,
          mode,
          departure_time: 'now'
        });

        if (result.success && result.data.routes.length > 0) {
          const route = result.data.routes[0];
          travelOptions.push({
            mode,
            duration: route.duration,
            durationText: route.durationText,
            distance: route.distance,
            distanceText: route.distanceText
          });
        }
      } catch (error) {
        console.error(`Error calculating route for mode ${mode}:`, error);
        // Continue with other modes even if one fails
      }
    }

    if (travelOptions.length === 0) {
      console.log('No travel options found for user transport modes, trying walking as fallback');
      
      // Fallback to walking if no enabled transport modes worked
      try {
        const walkingResult = await directionsService.getDirections({
          origin,
          destination,
          mode: 'walking',
          departure_time: 'now'
        });

        if (walkingResult.success && walkingResult.data.routes.length > 0) {
          const route = walkingResult.data.routes[0];
          travelOptions.push({
            mode: 'walking',
            duration: route.duration,
            durationText: route.durationText,
            distance: route.distance,
            distanceText: route.distanceText
          });
          
          console.log('Walking fallback successful');
        } else {
          throw new Error('Walking fallback also failed');
        }
      } catch (error) {
        console.error('Walking fallback failed:', error);
        return res.status(400).json({
          success: false,
          error: 'Could not calculate travel time for any transport mode, including walking fallback'
        });
      }
    }

    // Find the fastest option
    const fastestOption = travelOptions.reduce((fastest, current) => 
      current.duration < fastest.duration ? current : fastest
    );

    res.json({
      success: true,
      data: {
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          picture: targetUser.picture
        },
        travelOptions,
        fastestOption,
        origin: {
          lat: currentLat,
          lng: currentLng
        },
        destination: {
          lat: targetLat,
          lng: targetLng
        }
      }
    });
  } catch (error) {
    console.error('Error calculating travel time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate travel time',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:googleId/friends
 * Get user's friends list (for demo, returns other users with location data)
 */
router.get('/:googleId/friends', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;
    
    // For demo purposes, get all users except the current user
    // In a real app, you'd have a proper friends/connections system
    const allUsers = await usersDB.scanTable();
    const friends = allUsers
      .filter(user => user.id !== googleId && user.lat && user.lng) // Only include users with location data
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        lat: user.lat,
        lng: user.lng
      }));

    res.json({
      success: true,
      data: friends,
      count: friends.length
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friends',
      message: error.message
    });
  }
});

/**
 * GET /api/users/:googleId/transport-settings
 * Get user's transport settings
 */
router.get('/:googleId/transport-settings', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;
    
    // Verify user has permission to access this data
    if (req.user.id !== googleId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const user = await usersDB.getItem({ id: googleId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        transportModes: user.transportModes || ['driving']
      }
    });
  } catch (error) {
    console.error('Error fetching transport settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transport settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/users/:googleId/transport-settings
 * Update user's transport settings
 */
router.put('/:googleId/transport-settings', authenticateToken, async (req, res) => {
  try {
    const { googleId } = req.params;
    const { transportModes } = req.body;
    
    // Verify user has permission to update this data
    if (req.user.id !== googleId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Validate transport modes
    const validModes = ['walking', 'driving', 'transit', 'bicycling'];
    if (!Array.isArray(transportModes) || 
        transportModes.length === 0 || 
        !transportModes.every(mode => validModes.includes(mode))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transport modes'
      });
    }

    // Update user's transport modes
    const updatedUser = await usersDB.updateItem(
      { id: googleId },
      {
        transportModes: transportModes,
        updatedAt: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating transport settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transport settings',
      message: error.message
    });
  }
});

/**
 * POST /api/users/transport-settings/batch
 * Get transport settings for multiple users
 */
router.post('/transport-settings/batch', authenticateToken, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be a non-empty array'
      });
    }

    const transportSettings = {};
    
    // Get transport settings for each user
    for (const userId of userIds) {
      try {
        const user = await usersDB.getItem({ id: userId });
        transportSettings[userId] = user?.transportModes || ['driving'];
      } catch (error) {
        console.error(`Error fetching transport settings for user ${userId}:`, error);
        transportSettings[userId] = ['driving']; // Default fallback
      }
    }

    res.json({
      success: true,
      data: transportSettings
    });
  } catch (error) {
    console.error('Error fetching batch transport settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transport settings',
      message: error.message
    });
  }
});

module.exports = router;