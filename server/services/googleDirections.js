const { Client } = require('@googlemaps/google-maps-services-js');

/**
 * Google Directions Service
 * Handles all Google Maps API interactions for route planning and directions
 */
class GoogleDirectionsService {
  constructor() {
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Please set GOOGLE_MAPS_API_KEY in your environment variables.');
    }
  }

  /**
   * Calculate directions between two points
   * @param {Object} params - Direction parameters
   * @param {string} params.origin - Starting location (lat,lng or address)
   * @param {string} params.destination - Ending location (lat,lng or address)
   * @param {string} params.mode - Travel mode: driving, walking, transit, bicycling
   * @param {string} params.departure_time - Departure time (timestamp or 'now')
   * @param {string} params.arrival_time - Arrival time (timestamp)
   * @param {Array} params.waypoints - Array of intermediate stops
   * @param {boolean} params.optimize_waypoints - Optimize waypoint order
   * @param {string} params.avoid - Things to avoid: tolls, highways, ferries, indoor
   * @returns {Promise<Object>} Directions response with routes, duration, distance
   */
  async getDirections(params) {
    try {
      const {
        origin,
        destination,
        mode = 'driving',
        departure_time,
        arrival_time,
        waypoints,
        optimize_waypoints = false,
        avoid,
        alternatives = true
      } = params;

      const request = {
        params: {
          origin,
          destination,
          mode,
          key: this.apiKey,
          alternatives
        }
      };

      // Add optional parameters
      if (departure_time) request.params.departure_time = departure_time;
      if (arrival_time) request.params.arrival_time = arrival_time;
      if (waypoints && waypoints.length > 0) {
        request.params.waypoints = waypoints;
        request.params.optimize_waypoints = optimize_waypoints;
      }
      if (avoid) request.params.avoid = avoid;

      const response = await this.client.directions(request);
      
      return {
        success: true,
        data: this.formatDirectionsResponse(response.data),
        raw: response.data
      };
    } catch (error) {
      console.error('Error getting directions:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message,
        status: error.response?.data?.status
      };
    }
  }

  /**x
   * Calculate travel matrix between multiple origins and destinations
   * @param {Object} params - Matrix parameters
   * @param {Array} params.origins - Array of origin locations
   * @param {Array} params.destinations - Array of destination locations
   * @param {string} params.mode - Travel mode
   * @param {string} params.departure_time - Departure time
   * @returns {Promise<Object>} Distance matrix response
   */
  async getDistanceMatrix(params) {
    try {
      const {
        origins,
        destinations,
        mode = 'driving',
        departure_time,
        avoid
      } = params;

      const request = {
        params: {
          origins,
          destinations,
          mode,
          key: this.apiKey,
          units: 'metric'
        }
      };

      if (departure_time) request.params.departure_time = departure_time;
      if (avoid) request.params.avoid = avoid;

      const response = await this.client.distancematrix(request);
      
      return {
        success: true,
        data: this.formatMatrixResponse(response.data),
        raw: response.data
      };
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      return {
        success: false,
        error: error.response?.data?.error_message || error.message,
        status: error.response?.data?.status
      };
    }
  }

  /**
   * Plan optimal itinerary for a group meetup
   * @param {Object} params - Itinerary parameters
   * @param {Array} params.participants - Array of participant objects with locations
   * @param {string} params.destination - Target meeting location
   * @param {string} params.meetingTime - Desired meeting time
   * @param {string} params.mode - Transportation mode
   * @returns {Promise<Object>} Optimized itinerary with departure times and routes
   */
  async planGroupItinerary(params) {
    try {
      const { participants, destination, meetingTime, mode = 'driving' } = params;
      
      // Get travel times from each participant to destination
      const origins = participants.map(p => `${p.lat},${p.lng}`);
      const matrixResult = await this.getDistanceMatrix({
        origins,
        destinations: [destination],
        mode,
        arrival_time: meetingTime
      });

      if (!matrixResult.success) {
        return matrixResult;
      }

      // Calculate departure times for each participant
      const itinerary = participants.map((participant, index) => {
        const element = matrixResult.data.rows[index]?.elements[0];
        
        if (!element || element.status !== 'OK') {
          return {
            participantId: participant.id,
            participantName: participant.name,
            error: 'Could not calculate route',
            status: element?.status || 'UNKNOWN_ERROR'
          };
        }

        const travelTimeSeconds = element.duration.value;
        const meetingTimeMs = new Date(meetingTime).getTime();
        const departureTime = new Date(meetingTimeMs - (travelTimeSeconds * 1000));

        return {
          participantId: participant.id,
          participantName: participant.name,
          origin: `${participant.lat},${participant.lng}`,
          destination,
          departureTime: departureTime.toISOString(),
          arrivalTime: meetingTime,
          travelTime: element.duration.text,
          travelTimeSeconds,
          distance: element.distance.text,
          distanceMeters: element.distance.value,
          mode
        };
      });

      // Get detailed routes for each participant
      const routePromises = itinerary
        .filter(item => !item.error)
        .map(async (item) => {
          const routeResult = await this.getDirections({
            origin: item.origin,
            destination: item.destination,
            mode,
            arrival_time: Math.floor(new Date(meetingTime).getTime() / 1000)
          });

          if (routeResult.success) {
            item.route = routeResult.data.routes[0];
          }
          
          return item;
        });

      const detailedItinerary = await Promise.all(routePromises);
      
      return {
        success: true,
        data: {
          meetingPoint: destination,
          meetingTime,
          participants: detailedItinerary,
          summary: {
            totalParticipants: participants.length,
            successfulRoutes: detailedItinerary.filter(i => !i.error).length,
            averageTravelTime: this.calculateAverageTravelTime(detailedItinerary),
            earliestDeparture: this.findEarliestDeparture(detailedItinerary),
            latestDeparture: this.findLatestDeparture(detailedItinerary)
          }
        }
      };
    } catch (error) {
      console.error('Error planning group itinerary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find optimal meeting point for a group
   * @param {Array} participants - Array of participant locations
   * @param {Object} constraints - Meeting constraints (max travel time, preferred areas)
   * @returns {Promise<Object>} Suggested meeting points with travel times
   */
  async findOptimalMeetingPoint(participants, constraints = {}) {
    try {
      const { maxTravelTimeMinutes = 60, searchRadius = 10000 } = constraints;
      
      // Calculate centroid of all participant locations
      const centroid = this.calculateCentroid(participants);
      
      // For now, return the centroid as the optimal meeting point
      // In a more advanced implementation, you could use Google Places API
      // to find actual venues near the centroid
      
      const meetingPoint = `${centroid.lat},${centroid.lng}`;
      
      // Calculate travel times from all participants to the centroid
      const origins = participants.map(p => `${p.lat},${p.lng}`);
      const matrixResult = await this.getDistanceMatrix({
        origins,
        destinations: [meetingPoint],
        mode: 'driving'
      });

      if (!matrixResult.success) {
        return matrixResult;
      }

      const travelTimes = matrixResult.data.rows.map((row, index) => ({
        participantId: participants[index].id,
        participantName: participants[index].name,
        travelTime: row.elements[0]?.duration?.text || 'Unknown',
        travelTimeSeconds: row.elements[0]?.duration?.value || 0,
        distance: row.elements[0]?.distance?.text || 'Unknown'
      }));

      const maxTravelTime = Math.max(...travelTimes.map(t => t.travelTimeSeconds));
      const avgTravelTime = travelTimes.reduce((sum, t) => sum + t.travelTimeSeconds, 0) / travelTimes.length;

      return {
        success: true,
        data: {
          suggestedMeetingPoint: {
            location: meetingPoint,
            lat: centroid.lat,
            lng: centroid.lng,
            description: 'Calculated centroid of all participants'
          },
          travelTimes,
          summary: {
            maxTravelTimeSeconds: maxTravelTime,
            maxTravelTimeMinutes: Math.round(maxTravelTime / 60),
            avgTravelTimeSeconds: Math.round(avgTravelTime),
            avgTravelTimeMinutes: Math.round(avgTravelTime / 60),
            isWithinConstraints: maxTravelTime <= (maxTravelTimeMinutes * 60)
          }
        }
      };
    } catch (error) {
      console.error('Error finding optimal meeting point:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format Google Directions API response
   */
  formatDirectionsResponse(data) {
    return {
      routes: data.routes.map(route => ({
        summary: route.summary,
        distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
        duration: route.legs.reduce((total, leg) => total + leg.duration.value, 0),
        distanceText: route.legs.map(leg => leg.distance.text).join(', '),
        durationText: route.legs.map(leg => leg.duration.text).join(', '),
        startAddress: route.legs[0]?.start_address,
        endAddress: route.legs[route.legs.length - 1]?.end_address,
        polyline: route.overview_polyline.points,
        legs: route.legs.map(leg => ({
          distance: leg.distance,
          duration: leg.duration,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          startLocation: leg.start_location,
          endLocation: leg.end_location,
          steps: leg.steps.map(step => ({
            distance: step.distance,
            duration: step.duration,
            instructions: step.html_instructions,
            maneuver: step.maneuver,
            polyline: step.polyline.points
          }))
        }))
      })),
      status: data.status
    };
  }

  /**
   * Format Google Distance Matrix API response
   */
  formatMatrixResponse(data) {
    return {
      originAddresses: data.origin_addresses,
      destinationAddresses: data.destination_addresses,
      rows: data.rows.map(row => ({
        elements: row.elements.map(element => ({
          status: element.status,
          distance: element.distance,
          duration: element.duration,
          durationInTraffic: element.duration_in_traffic
        }))
      })),
      status: data.status
    };
  }

  /**
   * Calculate centroid of participant locations
   */
  calculateCentroid(participants) {
    const lat = participants.reduce((sum, p) => sum + p.lat, 0) / participants.length;
    const lng = participants.reduce((sum, p) => sum + p.lng, 0) / participants.length;
    return { lat, lng };
  }

  /**
   * Calculate average travel time from itinerary
   */
  calculateAverageTravelTime(itinerary) {
    const validItems = itinerary.filter(item => !item.error && item.travelTimeSeconds);
    if (validItems.length === 0) return 0;
    
    const totalSeconds = validItems.reduce((sum, item) => sum + item.travelTimeSeconds, 0);
    return Math.round(totalSeconds / validItems.length);
  }

  /**
   * Find earliest departure time from itinerary
   */
  findEarliestDeparture(itinerary) {
    const validItems = itinerary.filter(item => !item.error && item.departureTime);
    if (validItems.length === 0) return null;
    
    return validItems.reduce((earliest, item) => {
      return new Date(item.departureTime) < new Date(earliest.departureTime) ? item : earliest;
    }).departureTime;
  }

  /**
   * Find latest departure time from itinerary
   */
  findLatestDeparture(itinerary) {
    const validItems = itinerary.filter(item => !item.error && item.departureTime);
    if (validItems.length === 0) return null;
    
    return validItems.reduce((latest, item) => {
      return new Date(item.departureTime) > new Date(latest.departureTime) ? item : latest;
    }).departureTime;
  }
}

module.exports = GoogleDirectionsService;