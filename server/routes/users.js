const express = require('express');
const DynamoDBService = require('../services/dynamodb');

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
 * GET /api/users/:id
 * Get a specific user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usersDB.getItem({ id });
    
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
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req, res) => {
  try {
    const { name, lat, lng, availability, friends } = req.body;
    
    // Basic validation
    if (!name || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name, lat, and lng are required'
      });
    }

    const userId = `u${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const newUser = {
      id: userId,
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      availability: availability || [],
      friends: friends || []
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
 * PUT /api/users/:id
 * Update an existing user
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lng, availability, friends } = req.body;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Build update expression
    let updateExpression = 'SET';
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    const updateParts = [];

    if (name) {
      updateParts.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
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

    if (updateParts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateExpression += ` ${updateParts.join(', ')}`;

    const updatedAttributes = await usersDB.updateItem(
      { id },
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
 * DELETE /api/users/:id
 * Delete a user
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await usersDB.deleteItem({ id });

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
 * PUT /api/users/:id/location
 * Update user's current location
 */
router.put('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Both lat and lng are required'
      });
    }

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updatedAttributes = await usersDB.updateItem(
      { id },
      'SET lat = :lat, lng = :lng',
      { 
        ':lat': parseFloat(lat),
        ':lng': parseFloat(lng)
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
 * POST /api/users/:id/availability
 * Add availability window for a user
 */
router.post('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end, location } = req.body;

    if (!start || !end || !location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'start, end, and location (with lat/lng) are required'
      });
    }

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
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
      { id },
      'SET availability = :availability',
      { ':availability': updatedAvailability }
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
 * DELETE /api/users/:id/availability/:index
 * Remove specific availability window by index
 */
router.delete('/:id/availability/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const availabilityIndex = parseInt(index);

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
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
      { id },
      'SET availability = :availability',
      { ':availability': updatedAvailability }
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
 * POST /api/users/:id/friends
 * Add friends to a user
 */
router.post('/:id/friends', async (req, res) => {
  try {
    const { id } = req.params;
    const { friendIds } = req.body;

    if (!friendIds || !Array.isArray(friendIds)) {
      return res.status(400).json({
        success: false,
        error: 'friendIds must be an array'
      });
    }

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
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
      { id },
      'SET friends = :friends',
      { ':friends': newFriends }
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
 * DELETE /api/users/:id/friends/:friendId
 * Remove a friend from user's friends list
 */
router.delete('/:id/friends/:friendId', async (req, res) => {
  try {
    const { id, friendId } = req.params;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const currentFriends = existingUser.friends || [];
    const updatedFriends = currentFriends.filter(fId => fId !== friendId);

    const updatedAttributes = await usersDB.updateItem(
      { id },
      'SET friends = :friends',
      { ':friends': updatedFriends }
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
 * GET /api/users/:id/friends
 * Get user's friends with their details
 */
router.get('/:id/friends', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await usersDB.getItem({ id });
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

module.exports = router;