const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const GoogleDirectionsService = require('../services/googleDirections');

const router = express.Router();
const directionsService = new GoogleDirectionsService();

/**
 * GET /directions
 * Calculate route between two points using query parameters
 * Query: ?origin=lat,lng&destination=lat,lng&mode=driving&departure_time=timestamp
 */
router.get('/', async (req, res) => {
  try {
    const {
      origin,
      destination,
      mode = 'driving',
      departure_time,
      arrival_time,
      avoid
    } = req.query;

    // Validate required fields
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }

    const result = await directionsService.getDirections({
      origin,
      destination,
      mode,
      departure_time,
      arrival_time,
      avoid
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Route calculated successfully'
    });
  } catch (error) {
    console.error('Error in route calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate route',
      message: error.message
    });
  }
});

/**
 * POST /directions/route
 * Calculate route between two points
 * Body: { origin, destination, mode?, departure_time?, waypoints?, avoid? }
 */
router.post('/route', authenticateToken, async (req, res) => {
  try {
    const {
      origin,
      destination,
      mode = 'driving',
      departure_time,
      arrival_time,
      waypoints,
      optimize_waypoints,
      avoid
    } = req.body;

    // Validate required fields
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }

    const result = await directionsService.getDirections({
      origin,
      destination,
      mode,
      departure_time,
      arrival_time,
      waypoints,
      optimize_waypoints,
      avoid
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Route calculated successfully'
    });
  } catch (error) {
    console.error('Error in route calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate route',
      message: error.message
    });
  }
});

/**
 * POST /directions/matrix
 * Calculate distance matrix between multiple origins and destinations
 * Body: { origins[], destinations[], mode?, departure_time? }
 */
router.post('/matrix', authenticateToken, async (req, res) => {
  try {
    const {
      origins,
      destinations,
      mode = 'driving',
      departure_time,
      avoid
    } = req.body;

    // Validate required fields
    if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
      return res.status(400).json({
        success: false,
        error: 'Origins and destinations arrays are required'
      });
    }

    const result = await directionsService.getDistanceMatrix({
      origins,
      destinations,
      mode,
      departure_time,
      avoid
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Distance matrix calculated successfully'
    });
  } catch (error) {
    console.error('Error in distance matrix calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate distance matrix',
      message: error.message
    });
  }
});

/**
 * POST /directions/plan-itinerary
 * Plan optimal itinerary for group meetup
 * Body: { 
 *   participants: [{ id, name, lat, lng }], 
 *   destination, 
 *   meetingTime, 
 *   mode? 
 * }
 */
router.post('/plan-itinerary', authenticateToken, async (req, res) => {
  try {
    const {
      participants,
      destination,
      meetingTime,
      mode = 'driving'
    } = req.body;

    // Validate required fields
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Participants array is required and must not be empty'
      });
    }

    if (!destination) {
      return res.status(400).json({
        success: false,
        error: 'Destination is required'
      });
    }

    if (!meetingTime) {
      return res.status(400).json({
        success: false,
        error: 'Meeting time is required'
      });
    }

    // Validate participants have required fields
    const invalidParticipants = participants.filter(p => 
      !p.id || !p.name || typeof p.lat !== 'number' || typeof p.lng !== 'number'
    );

    if (invalidParticipants.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All participants must have id, name, lat, and lng fields'
      });
    }

    const result = await directionsService.planGroupItinerary({
      participants,
      destination,
      meetingTime,
      mode
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Group itinerary planned successfully'
    });
  } catch (error) {
    console.error('Error in itinerary planning:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to plan itinerary',
      message: error.message
    });
  }
});

/**
 * POST /directions/optimal-meetup
 * Find optimal meeting point for a group
 * Body: { 
 *   participants: [{ id, name, lat, lng }], 
 *   constraints?: { maxTravelTimeMinutes?, searchRadius? }
 * }
 */
router.post('/optimal-meetup', authenticateToken, async (req, res) => {
  try {
    const {
      participants,
      constraints = {}
    } = req.body;

    // Validate required fields
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Participants array is required and must not be empty'
      });
    }

    // Validate participants have required fields
    const invalidParticipants = participants.filter(p => 
      !p.id || !p.name || typeof p.lat !== 'number' || typeof p.lng !== 'number'
    );

    if (invalidParticipants.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All participants must have id, name, lat, and lng fields'
      });
    }

    const result = await directionsService.findOptimalMeetingPoint(
      participants,
      constraints
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Optimal meeting point calculated successfully'
    });
  } catch (error) {
    console.error('Error finding optimal meeting point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find optimal meeting point',
      message: error.message
    });
  }
});

/**
 * GET /directions/modes
 * Get available transportation modes
 */
router.get('/modes', (req, res) => {
  res.json({
    success: true,
    data: {
      modes: [
        {
          id: 'driving',
          name: 'Driving',
          description: 'Travel by car',
          icon: '🚗'
        },
        {
          id: 'walking',
          name: 'Walking',
          description: 'Travel on foot',
          icon: '🚶'
        },
        {
          id: 'transit',
          name: 'Public Transit',
          description: 'Travel by bus, train, etc.',
          icon: '🚌'
        },
        {
          id: 'bicycling',
          name: 'Bicycling',
          description: 'Travel by bicycle',
          icon: '🚴'
        }
      ]
    },
    message: 'Available transportation modes'
  });
});

/**
 * POST /directions/bulk-routes
 * Calculate multiple routes at once (for event planning)
 * Body: { 
 *   routes: [{ origin, destination, mode?, departure_time? }]
 * }
 */
router.post('/bulk-routes', authenticateToken, async (req, res) => {
  try {
    const { routes } = req.body;

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Routes array is required and must not be empty'
      });
    }

    // Validate each route has required fields
    const invalidRoutes = routes.filter(r => !r.origin || !r.destination);
    if (invalidRoutes.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All routes must have origin and destination'
      });
    }

    // Calculate all routes in parallel
    const routePromises = routes.map(async (route, index) => {
      const result = await directionsService.getDirections({
        origin: route.origin,
        destination: route.destination,
        mode: route.mode || 'driving',
        departure_time: route.departure_time,
        avoid: route.avoid
      });

      return {
        index,
        ...route,
        result: result.success ? result.data : { error: result.error }
      };
    });

    const results = await Promise.all(routePromises);

    const successful = results.filter(r => !r.result.error);
    const failed = results.filter(r => r.result.error);

    res.json({
      success: true,
      data: {
        routes: results,
        summary: {
          total: routes.length,
          successful: successful.length,
          failed: failed.length
        }
      },
      message: `Calculated ${successful.length}/${routes.length} routes successfully`
    });
  } catch (error) {
    console.error('Error in bulk route calculation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate bulk routes',
      message: error.message
    });
  }
});

module.exports = router;