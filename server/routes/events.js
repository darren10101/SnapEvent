const express = require('express');
const DynamoDBService = require('../services/dynamodb');

const router = express.Router();

// Initialize DynamoDB service for events table
const eventsDB = new DynamoDBService(process.env.EVENTS_TABLE || 'snapevent-events');

/**
 * GET /api/events
 * Get all events
 */
router.get('/', async (req, res) => {
  try {
    const events = await eventsDB.scanTable();
    res.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

/**
 * GET /api/events/user/:googleId
 * Get all events for a specific user (created by or participating in)
 */
router.get('/user/:googleId', async (req, res) => {
  try {
    const { googleId } = req.params;

    // Validate Google ID
    if (typeof googleId !== 'string' || googleId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google ID'
      });
    }

    // Get all events and filter by user involvement
    const allEvents = await eventsDB.scanTable();
    
    const userEvents = allEvents.filter(event => 
      event.createdBy === googleId || 
      (event.participants && event.participants.includes(googleId))
    );

    res.json({
      success: true,
      data: userEvents,
      count: userEvents.length
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user events',
      message: error.message
    });
  }
});

/**
 * GET /api/events/:id
 * Get a specific event by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await eventsDB.getItem({ id });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message
    });
  }
});

/**
 * POST /api/events
 * Create a new event
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, location, start, end, createdBy, participants } = req.body;
    
    // Basic validation
    if (!name || !location || !start || !end || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'Name, location, start, end, and createdBy (Google ID) are required'
      });
    }

    // Validate location object
    if (!location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'Location must include lat and lng coordinates'
      });
    }

    // Validate that createdBy is a valid Google ID (basic check)
    if (typeof createdBy !== 'string' || createdBy.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'createdBy must be a valid Google ID'
      });
    }

    const eventId = `e${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const newEvent = {
      id: eventId,
      name,
      description: description || '',
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        description: location.description || ''
      },
      start,
      end,
      createdBy, // Google ID of creator
      participants: participants || [createdBy], // Array of Google IDs
      itineraries: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await eventsDB.putItem(newEvent);

    res.status(201).json({
      success: true,
      data: newEvent,
      message: 'Event created successfully'
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

/**
 * PUT /api/events/:id
 * Update an existing event
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, start, end, participants } = req.body;

    // Check if event exists
    const existingEvent = await eventsDB.getItem({ id });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Build update expression
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };
    const expressionAttributeNames = {};
    const updateParts = ['updatedAt = :updatedAt'];

    if (name) {
      updateParts.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }

    if (description !== undefined) {
      updateParts.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = description;
    }
    
    if (location && location.lat && location.lng) {
      updateParts.push('#location = :location');
      expressionAttributeNames['#location'] = 'location';
      expressionAttributeValues[':location'] = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        description: location.description || ''
      };
    }
    
    if (start) {
      updateParts.push('#start = :start');
      expressionAttributeNames['#start'] = 'start';
      expressionAttributeValues[':start'] = start;
    }
    
    if (end) {
      updateParts.push('#end = :end');
      expressionAttributeNames['#end'] = 'end';
      expressionAttributeValues[':end'] = end;
    }
    
    if (participants && Array.isArray(participants)) {
      // Validate that all participants are valid Google IDs
      const invalidParticipants = participants.filter(p => typeof p !== 'string' || p.length < 10);
      if (invalidParticipants.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'All participants must be valid Google IDs'
        });
      }
      
      updateParts.push('participants = :participants');
      expressionAttributeValues[':participants'] = participants;
    }

    updateExpression = `SET ${updateParts.join(', ')}`;

    const updatedAttributes = await eventsDB.updateItem(
      { id },
      updateExpression,
      expressionAttributeValues,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message
    });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const existingEvent = await eventsDB.getItem({ id });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    await eventsDB.deleteItem({ id });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message
    });
  }
});

/**
 * POST /api/events/:id/participants
 * Add participants to an event
 */
router.post('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        error: 'userIds must be an array of Google IDs'
      });
    }

    // Validate that all userIds are valid Google IDs
    const invalidIds = userIds.filter(userId => typeof userId !== 'string' || userId.length < 10);
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All userIds must be valid Google IDs'
      });
    }

    // Check if event exists
    const existingEvent = await eventsDB.getItem({ id });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Add new participants to existing ones (avoiding duplicates)
    const currentParticipants = existingEvent.participants || [];
    const newParticipants = [...new Set([...currentParticipants, ...userIds])];

    const updatedAttributes = await eventsDB.updateItem(
      { id },
      'SET participants = :participants, updatedAt = :updatedAt',
      { 
        ':participants': newParticipants,
        ':updatedAt': new Date().toISOString()
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Participants added successfully'
    });
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add participants',
      message: error.message
    });
  }
});

/**
 * PUT /api/events/:id/itinerary/:googleId
 * Set itinerary for a specific user (identified by Google ID)
 */
router.put('/:id/itinerary/:googleId', async (req, res) => {
  try {
    const { id, googleId } = req.params;
    const { steps } = req.body;

    if (!steps || !Array.isArray(steps)) {
      return res.status(400).json({
        success: false,
        error: 'steps must be an array'
      });
    }

    // Validate each step
    for (const step of steps) {
      if (!step.mode || !step.from || !step.to || !step.departureTime || !step.arrivalTime) {
        return res.status(400).json({
          success: false,
          error: 'Each step must include mode, from, to, departureTime, and arrivalTime'
        });
      }
    }

    // Validate Google ID
    if (typeof googleId !== 'string' || googleId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google ID'
      });
    }

    // Check if event exists
    const existingEvent = await eventsDB.getItem({ id });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Update the itinerary for the specific user
    const updatedAttributes = await eventsDB.updateItem(
      { id },
      'SET itineraries.#googleId = :userItinerary, updatedAt = :updatedAt',
      { 
        ':userItinerary': { steps },
        ':updatedAt': new Date().toISOString()
      },
      {
        '#googleId': googleId
      }
    );

    res.json({
      success: true,
      data: updatedAttributes,
      message: 'Itinerary updated successfully'
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update itinerary',
      message: error.message
    });
  }
});

/**
 * GET /api/events/:id/itinerary/:googleId
 * Get itinerary for a specific user (identified by Google ID)
 */
router.get('/:id/itinerary/:googleId', async (req, res) => {
  try {
    const { id, googleId } = req.params;

    // Validate Google ID
    if (typeof googleId !== 'string' || googleId.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Google ID'
      });
    }

    const event = await eventsDB.getItem({ id });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const userItinerary = event.itineraries && event.itineraries[googleId];
    
    if (!userItinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found for this user'
      });
    }

    res.json({
      success: true,
      data: userItinerary
    });
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch itinerary',
      message: error.message
    });
  }
});

module.exports = router;