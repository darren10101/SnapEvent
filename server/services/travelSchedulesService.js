const DynamoDBService = require('./dynamodb');
const GoogleDirectionsService = require('./googleDirections');

/**
 * Service for generating and managing travel schedules for events
 */
class TravelSchedulesService {
  constructor() {
    this.usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');
    this.directionsService = new GoogleDirectionsService();
  }

  /**
   * Generate travel schedules for all participants in an event
   */
  async generateEventTravelSchedules(eventId, participantIds, eventLocation, eventStart, eventEnd, startingLocations = {}) {
    try {
      console.log(`Generating travel schedules for event ${eventId} with ${participantIds.length} participants`);
      console.log('Starting locations:', startingLocations);

      // Get user data for all participants
      const participants = await this.getParticipantsData(participantIds);
      
      if (participants.length === 0) {
        console.warn('No participants with valid data found');
        return [];
      }

      // Generate schedules for each participant
      const schedules = [];
      for (const participant of participants) {
        try {
          // Check if participant has a custom starting location for this event
          const userStartingLocation = startingLocations[participant.id];
          const originLocation = userStartingLocation ? {
            lat: userStartingLocation.lat,
            lng: userStartingLocation.lng
          } : {
            lat: participant.lat,
            lng: participant.lng
          };

          console.log(`User ${participant.name} (${participant.id}) using location:`, 
            userStartingLocation ? 'custom starting location' : 'profile location', originLocation);

          const schedule = await this.generateUserTravelSchedule(
            participant,
            eventLocation,
            eventStart,
            eventEnd,
            originLocation // Pass the determined origin location
          );
          
          if (schedule) {
            schedules.push(schedule);
          }
        } catch (error) {
          console.error(`Error generating schedule for user ${participant.id}:`, error);
        }
      }

      console.log(`Successfully generated ${schedules.length} travel schedules`);
      return schedules;

    } catch (error) {
      console.error('Error generating event travel schedules:', error);
      throw error;
    }
  }

  /**
   * Get participant data from database
   */
  async getParticipantsData(participantIds) {
    try {
      console.log(`Fetching data for ${participantIds.length} participants:`, participantIds);
      const participants = [];
      
      for (const userId of participantIds) {
        try {
          const user = await this.usersDB.getItem({ id: userId });
          console.log(`User ${userId} data:`, {
            found: !!user,
            hasLocation: !!(user?.lat && user?.lng),
            lat: user?.lat,
            lng: user?.lng,
            name: user?.name
          });
          
          if (user && user.lat && user.lng) {
            participants.push({
              id: user.id,
              name: user.name,
              picture: user.picture,
              lat: user.lat,
              lng: user.lng,
              transportModes: user.transportModes || ['driving']
            });
          } else {
            console.warn(`User ${userId} not found or missing location data`);
          }
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
        }
      }

      console.log(`Found ${participants.length} participants with valid location data`);
      return participants;
    } catch (error) {
      console.error('Error getting participants data:', error);
      throw error;
    }
  }

  /**
   * Generate travel schedule for a single user
   */
  async generateUserTravelSchedule(user, eventLocation, eventStart, eventEnd, originLocation = null) {
    try {
      // Use provided origin location or fall back to user's profile location
      const origin = originLocation || { lat: user.lat, lng: user.lng };
      console.log(`Generating schedule for ${user.name} using ${user.transportModes[0]} from`, origin);

      const primaryMode = user.transportModes[0] || 'driving';
      const startDate = new Date(eventStart);
      const endDate = new Date(eventEnd);

      // Calculate outbound trip (to event) - arrive by event start time
      const outboundDirections = await this.calculateTravelDirections(
        origin,
        eventLocation,
        primaryMode,
        { arrivalTime: startDate }
      );

      if (!outboundDirections) {
        console.warn(`Failed to get outbound directions for ${user.name}`);
        return null;
      }

      // Calculate return trip (from event) - depart when event ends
      const returnDirections = await this.calculateTravelDirections(
        eventLocation,
        origin,
        primaryMode,
        { departureTime: endDate }
      );

      if (!returnDirections) {
        console.warn(`Failed to get return directions for ${user.name}`);
        return null;
      }

      // Calculate timing with buffer
      const bufferMinutes = 5;
      const outboundDepartureTime = outboundDirections.departureTime || 
        new Date(startDate.getTime() - (outboundDirections.duration + bufferMinutes) * 60000);
      const outboundArrivalTime = outboundDirections.arrivalTime || 
        new Date(startDate.getTime() - bufferMinutes * 60000);

      const returnDepartureTime = returnDirections.departureTime || new Date(endDate);
      const returnArrivalTime = returnDirections.arrivalTime || 
        new Date(endDate.getTime() + returnDirections.duration * 60000);

      return {
        userId: user.id,
        userName: user.name,
        userPicture: user.picture,
        transportMode: primaryMode,
        outbound: {
          departureTime: outboundDepartureTime.toISOString(),
          arrivalTime: outboundArrivalTime.toISOString(),
          duration: outboundDirections.duration,
          distance: outboundDirections.distance,
          steps: outboundDirections.steps
        },
        return: {
          departureTime: returnDepartureTime.toISOString(),
          arrivalTime: returnArrivalTime.toISOString(),
          duration: returnDirections.duration,
          distance: returnDirections.distance,
          steps: returnDirections.steps
        }
      };

    } catch (error) {
      console.error(`Error generating schedule for user ${user.id}:`, error);
      return null;
    }
  }

  /**
   * Calculate travel directions using Google Directions API
   */
  async calculateTravelDirections(origin, destination, transportMode, timing) {
    try {
      const params = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: transportMode
      };

      // Add timing parameters for transit scheduling
      if (timing?.departureTime) {
        params.departure_time = Math.floor(timing.departureTime.getTime() / 1000);
      } else if (timing?.arrivalTime) {
        params.arrival_time = Math.floor(timing.arrivalTime.getTime() / 1000);
      }

      const result = await this.directionsService.getDirections(params);

      if (result.success && result.data.routes.length > 0) {
        const route = result.data.routes[0];
        const leg = route.legs[0];

        if (!leg || !leg.duration || !leg.distance || !leg.steps) {
          console.warn('Invalid route data structure:', leg);
          return null;
        }

        return {
          duration: Math.ceil(leg.duration.value / 60), // Convert to minutes
          distance: leg.distance.text,
          departureTime: leg.departureTime ? new Date(leg.departureTime.value * 1000) : undefined,
          arrivalTime: leg.arrivalTime ? new Date(leg.arrivalTime.value * 1000) : undefined,
          steps: leg.steps.map(step => ({
            instruction: this.stripHtml(step.instructions || step.html_instructions || 'Continue on route'),
            duration: Math.ceil((step.duration?.value || 0) / 60),
            distance: step.distance?.text || 'Unknown distance',
            travelMode: step.travel_mode ? step.travel_mode.toLowerCase() : 'unknown',
            transitDetails: step.transitDetails || undefined
          }))
        };
      }

      console.warn('No valid routes found in response');
      return null;

    } catch (error) {
      console.error('Error calculating directions:', error);
      return null;
    }
  }

  /**
   * Strip HTML tags from text
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

// Export singleton instance
module.exports = new TravelSchedulesService();