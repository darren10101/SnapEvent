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

    // Check if we need to invalidate travel schedules cache
    const shouldInvalidateCache = name || location || start || end || participants;

    if (shouldInvalidateCache) {
      // Clear travel schedules cache since event details changed
      updateExpression = `SET ${updateParts.join(', ')} REMOVE travelSchedulesCache`;
    }

    const updatedAttributes = await eventsDB.updateItem(
      { id },
      updateExpression,
      expressionAttributeValues,
      Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    );

    if (shouldInvalidateCache) {
      console.log(`Travel schedules cache invalidated for event ${id} due to event changes`);
    }

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

    // Clear travel schedules cache since participants changed
    const updatedAttributes = await eventsDB.updateItem(
      { id },
      'SET participants = :participants, updatedAt = :updatedAt REMOVE travelSchedulesCache',
      { 
        ':participants': newParticipants,
        ':updatedAt': new Date().toISOString()
      }
    );

    console.log(`Travel schedules cache invalidated for event ${id} due to participant changes`);

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

/**
 * GET /api/events/:id/travel-schedules
 * Get cached travel schedules for all participants in an event
 */
router.get('/:id/travel-schedules', async (req, res) => {
  try {
    const { id } = req.params;
    const { regenerate } = req.query;
    const requestingUserId = req.user?.id; // Get the requesting user ID from auth

    const event = await eventsDB.getItem({ id });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    console.log(`Travel schedules request for event ${id} by user ${requestingUserId}`);

    // Check if cached schedules exist and are valid (unless regenerate is requested)
    const shouldRegenerate = regenerate === 'true' || !event.travelSchedulesCache || !event.travelSchedulesCache.data;
    
    if (!shouldRegenerate) {
      // Check if cache is still valid (not expired)
      const cacheAge = Date.now() - new Date(event.travelSchedulesCache.generatedAt).getTime();
      const cacheExpiry = 30 * 60 * 1000; // 30 minutes
      
      if (cacheAge < cacheExpiry) {
        console.log(`Serving cached travel schedules for event ${id}`);
        return res.json({
          success: true,
          data: event.travelSchedulesCache.data,
          cached: true,
          generatedAt: event.travelSchedulesCache.generatedAt
        });
      }
    }

    // Need to regenerate schedules
    console.log(`Generating travel schedules for event ${id}`);
    
    // Ensure requesting user is included in participants if they're authenticated
    let participantIds = event.participants || [];
    if (requestingUserId && !participantIds.includes(requestingUserId)) {
      console.log(`Adding requesting user ${requestingUserId} to participants list`);
      participantIds = [...participantIds, requestingUserId];
    }
    
    console.log(`Participants for schedule generation:`, participantIds);
    
    // Generate new travel schedules
    const travelSchedulesService = require('../services/travelSchedulesService');
    const schedules = await travelSchedulesService.generateEventTravelSchedules(
      event.id,
      participantIds,
      event.location,
      event.start,
      event.end
    );

    // Cache the generated schedules
    const cacheData = {
      data: schedules,
      generatedAt: new Date().toISOString(),
      eventVersion: event.updatedAt,
      participants: event.participants || []
    };

    await eventsDB.updateItem(
      { id },
      'SET travelSchedulesCache = :cache',
      { ':cache': cacheData }
    );

    res.json({
      success: true,
      data: schedules,
      cached: false,
      generatedAt: cacheData.generatedAt
    });

  } catch (error) {
    console.error('Error fetching travel schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch travel schedules',
      message: error.message
    });
  }
});

/**
 * POST /api/events/:id/travel-schedules/regenerate
 * Force regeneration of travel schedules cache
 */
router.post('/:id/travel-schedules/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id; // Get the requesting user ID from auth

    const event = await eventsDB.getItem({ id });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    console.log(`Force regenerating travel schedules for event ${id} by user ${requestingUserId}`);
    
    // Ensure requesting user is included in participants if they're authenticated
    let participantIds = event.participants || [];
    if (requestingUserId && !participantIds.includes(requestingUserId)) {
      console.log(`Adding requesting user ${requestingUserId} to participants list for regeneration`);
      participantIds = [...participantIds, requestingUserId];
    }
    
    console.log(`Participants for schedule regeneration:`, participantIds);
    
    // Generate new travel schedules
    const travelSchedulesService = require('../services/travelSchedulesService');
    const schedules = await travelSchedulesService.generateEventTravelSchedules(
      event.id,
      participantIds,
      event.location,
      event.start,
      event.end
    );

    // Update cache
    const cacheData = {
      data: schedules,
      generatedAt: new Date().toISOString(),
      eventVersion: event.updatedAt,
      participants: event.participants || []
    };

    await eventsDB.updateItem(
      { id },
      'SET travelSchedulesCache = :cache',
      { ':cache': cacheData }
    );

    res.json({
      success: true,
      data: schedules,
      message: 'Travel schedules regenerated successfully',
      generatedAt: cacheData.generatedAt
    });

  } catch (error) {
    console.error('Error regenerating travel schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate travel schedules',
      message: error.message
    });
  }
});

/**
 * DELETE /api/events/:id/travel-schedules/cache
 * Clear travel schedules cache for an event
 */
router.delete('/:id/travel-schedules/cache', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await eventsDB.getItem({ id });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Clear the cache
    await eventsDB.updateItem(
      { id },
      'REMOVE travelSchedulesCache'
    );

    res.json({
      success: true,
      message: 'Travel schedules cache cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing travel schedules cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear travel schedules cache',
      message: error.message
    });
  }
});

module.exports = router;