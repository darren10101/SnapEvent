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
    const { name, location, start, end, createdBy, participants } = req.body;
    
    // Basic validation
    if (!name || !location || !start || !end || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'Name, location, start, end, and createdBy are required'
      });
    }

    // Validate location object
    if (!location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        error: 'Location must include lat and lng coordinates'
      });
    }

    const eventId = `e${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const newEvent = {
      id: eventId,
      name,
      location: {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
      },
      start,
      end,
      createdBy,
      participants: participants || [createdBy],
      itineraries: {}
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
    const { name, location, start, end, participants } = req.body;

    // Check if event exists
    const existingEvent = await eventsDB.getItem({ id });
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
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
    
    if (location && location.lat && location.lng) {
      updateParts.push('#location = :location');
      expressionAttributeNames['#location'] = 'location';
      expressionAttributeValues[':location'] = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng)
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
    
    if (participants) {
      updateParts.push('participants = :participants');
      expressionAttributeValues[':participants'] = participants;
    }

    if (updateParts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateExpression += ` ${updateParts.join(', ')}`;

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
        error: 'userIds must be an array'
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
      'SET participants = :participants',
      { ':participants': newParticipants }
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
 * PUT /api/events/:id/itinerary/:userId
 * Set itinerary for a specific user
 */
router.put('/:id/itinerary/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
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
      'SET itineraries.#userId = :userItinerary',
      { 
        ':userItinerary': { steps },
        ':userId': userId
      },
      {
        '#userId': userId
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
 * GET /api/events/:id/itinerary/:userId
 * Get itinerary for a specific user
 */
router.get('/:id/itinerary/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    const event = await eventsDB.getItem({ id });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const userItinerary = event.itineraries && event.itineraries[userId];
    
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