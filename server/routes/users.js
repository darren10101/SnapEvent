const express = require('express');
const DynamoDBService = require('../services/dynamodb');
const { authenticateToken, requireOwnership, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Initialize DynamoDB service for users table
const usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');

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
    const { googleId, email, name, picture, lat, lng, availability, friends } = req.body;
    
    // Basic validation
    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'googleId, email, and name are required'
      });
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
    const { name, picture, lat, lng, availability, friends } = req.body;

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
    const { action } = req.body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "accept" or "decline"'
      });
    }

    // Get the user who is responding to the request
    const user = await usersDB.getItem({ id: googleId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find the friend request
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

module.exports = router;