import { TransportMode } from './transportSettings';

export interface TravelSchedule {
  userId: string;
  userName: string;
  userPicture?: string;
  transportMode: TransportMode;
  outbound: {
    departureTime: Date;
    arrivalTime: Date;
    duration: number; // in minutes
    distance: string;
    steps: TravelStep[];
  };
  return: {
    departureTime: Date;
    arrivalTime: Date;
    duration: number; // in minutes
    distance: string;
    steps: TravelStep[];
  };
}

export interface TravelStep {
  instruction: string;
  duration: number; // in minutes
  distance: string;
  travelMode: string;
  transitDetails?: {
    departureStop?: {
      name: string;
      location: {
        lat: number;
        lng: number;
      };
    };
    arrivalStop?: {
      name: string;
      location: {
        lat: number;
        lng: number;
      };
    };
    departureTime?: {
      text: string;
      value: number;
      timeZone?: string;
    };
    arrivalTime?: {
      text: string;
      value: number;
      timeZone?: string;
    };
    line?: {
      name: string;
      shortName?: string;
      color?: string;
      vehicle?: {
        name: string;
        type: string;
        icon?: string;
      };
    };
    headsign?: string;
    numStops?: number;
  };
}

export interface UserLocation {
  userId: string;
  lat: number;
  lng: number;
  transportModes: TransportMode[];
}

/**
 * Fetch transport settings for multiple users
 */
export const fetchUsersTransportSettings = async (
  userIds: string[], 
  token?: string
): Promise<{ [userId: string]: TransportMode[] }> => {
  try {
    console.log('Fetching transport settings for users:', userIds);
    
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/transport-settings/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ userIds })
    });

    const data = await response.json();
    console.log('Transport settings response:', data);
    
    if (response.ok && data.success) {
      return data.data;
    } else {
      console.error('Failed to fetch transport settings:', data.error);
      // Return default settings for all users
      const defaults: { [userId: string]: TransportMode[] } = {};
      userIds.forEach(id => {
        defaults[id] = ['driving'];
      });
      return defaults;
    }
  } catch (error) {
    console.error('Error fetching transport settings:', error);
    // Return default settings for all users
    const defaults: { [userId: string]: TransportMode[] } = {};
    userIds.forEach(id => {
      defaults[id] = ['driving'];
    });
    return defaults;
  }
};

/**
 * Calculate travel directions for a user
 */
export const calculateTravelDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  transportMode: TransportMode,
  timing?: { departureTime?: Date; arrivalTime?: Date },
  token?: string
): Promise<{
  duration: number;
  distance: string;
  departureTime?: Date;
  arrivalTime?: Date;
  steps: TravelStep[];
} | null> => {
  try {
    console.log('Calculating directions:', {
      origin,
      destination,
      transportMode,
      timing
    });
    
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: transportMode,
    });

    // Add timing parameters for transit scheduling
    if (timing?.departureTime) {
      params.append('departure_time', Math.floor(timing.departureTime.getTime() / 1000).toString());
      console.log('Using departure time:', timing.departureTime.toISOString());
    } else if (timing?.arrivalTime) {
      params.append('arrival_time', Math.floor(timing.arrivalTime.getTime() / 1000).toString());
      console.log('Using arrival time:', timing.arrivalTime.toISOString());
    }

    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/directions?${params.toString()}`;
    console.log('Directions API URL:', url);

    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    });

    const data = await response.json();
    console.log('Directions API response:', data);
    
    if (response.ok && data.success && data.data.routes.length > 0) {
      const route = data.data.routes[0];
      const leg = route.legs[0];

      // Validate that we have the required data
      if (!leg || !leg.duration || !leg.distance || !leg.steps) {
        console.warn('Invalid route data structure:', leg);
        return null;
      }

      const result = {
        duration: Math.ceil(leg.duration.value / 60), // Convert to minutes
        distance: leg.distance.text,
        departureTime: leg.departureTime ? new Date(leg.departureTime.value * 1000) : undefined,
        arrivalTime: leg.arrivalTime ? new Date(leg.arrivalTime.value * 1000) : undefined,
        steps: leg.steps.map((step: any) => ({
          instruction: step.instructions ? step.instructions.replace(/<[^>]*>/g, '') : (step.html_instructions ? step.html_instructions.replace(/<[^>]*>/g, '') : 'Continue on route'), // Strip HTML or use fallback
          duration: Math.ceil((step.duration?.value || 0) / 60),
          distance: step.distance?.text || 'Unknown distance',
          travelMode: step.travel_mode ? step.travel_mode.toLowerCase() : 'unknown',
          transitDetails: step.transitDetails || undefined
        }))
      };
      
      console.log('Processed directions result:', result);
      return result;
    }
    
    console.warn('No valid routes found in response');
    return null;
  } catch (error) {
    console.error('Error calculating directions:', error);
    return null;
  }
};

/**
 * Generate travel schedule for a user
 */
export const generateUserTravelSchedule = async (
  user: { id: string; name: string; picture?: string; lat?: number; lng?: number },
  eventLocation: { lat: number; lng: number },
  eventStart: Date,
  eventEnd: Date,
  transportModes: TransportMode[],
  token?: string,
  startingLocation?: { lat: number; lng: number }
): Promise<TravelSchedule | null> => {
  // Use starting location if provided, otherwise use user's home location
  const originLocation = startingLocation || { lat: user.lat, lng: user.lng };
  
  if (!originLocation.lat || !originLocation.lng) {
    console.warn(`User ${user.name} does not have location data and no starting location provided`);
    return null;
  }

  // Use primary transport mode (first in array)
  const primaryMode = transportModes[0] || 'driving';
  console.log(`Generating schedule for ${user.name} using ${primaryMode}${startingLocation ? ' from custom starting location' : ' from home'}`);

  // Calculate outbound trip (to event) - arrive by event start time
  const outboundDirections = await calculateTravelDirections(
    originLocation,
    eventLocation,
    primaryMode,
    { arrivalTime: eventStart }, // Use arrival time for transit scheduling
    token
  );

  if (!outboundDirections) {
    console.warn(`Failed to get outbound directions for ${user.name}`);
    return null;
  }

  // Calculate return trip (from event) - depart when event ends
  // Always return to user's home location, not the starting location
  const returnDestination = { lat: user.lat, lng: user.lng };
  if (!returnDestination.lat || !returnDestination.lng) {
    console.warn(`User ${user.name} does not have home location for return trip`);
    return null;
  }

  const returnDirections = await calculateTravelDirections(
    eventLocation,
    returnDestination,
    primaryMode,
    { departureTime: eventEnd }, // Use departure time for return trip
    token
  );

  if (!returnDirections) {
    console.warn(`Failed to get return directions for ${user.name}`);
    return null;
  }

  // Calculate departure time to arrive by event start (with buffer) or use API timing
  const bufferMinutes = 5;
  const outboundDepartureTime = outboundDirections.departureTime || 
    new Date(eventStart.getTime() - (outboundDirections.duration + bufferMinutes) * 60000);
  const outboundArrivalTime = outboundDirections.arrivalTime || 
    new Date(eventStart.getTime() - bufferMinutes * 60000);

  // Return trip timing - use API timing or calculate from event end
  const returnDepartureTime = returnDirections.departureTime || new Date(eventEnd);
  const returnArrivalTime = returnDirections.arrivalTime || 
    new Date(eventEnd.getTime() + returnDirections.duration * 60000);

  console.log(`Timing for ${user.name}:`);
  console.log(`  Outbound: ${outboundDirections.departureTime ? 'Using real transit timing' : 'Using calculated timing'}`);
  console.log(`  Return: ${returnDirections.departureTime ? 'Using real transit timing' : 'Using calculated timing'}`);

  console.log(`Successfully generated schedule for ${user.name}`);

  return {
    userId: user.id,
    userName: user.name,
    userPicture: user.picture,
    transportMode: primaryMode,
    outbound: {
      departureTime: outboundDepartureTime,
      arrivalTime: outboundArrivalTime,
      duration: outboundDirections.duration,
      distance: outboundDirections.distance,
      steps: outboundDirections.steps
    },
    return: {
      departureTime: returnDepartureTime,
      arrivalTime: returnArrivalTime,
      duration: returnDirections.duration,
      distance: returnDirections.distance,
      steps: returnDirections.steps
    }
  };
};

/**
 * Generate travel schedules for all invited friends
 */
export const generateEventTravelSchedules = async (
  invitedFriends: Array<{ id: string; name: string; picture?: string; lat?: number; lng?: number }>,
  eventLocation: { lat: number; lng: number },
  eventStart: Date,
  eventEnd: Date,
  token?: string,
  startingLocation?: { lat: number; lng: number }
): Promise<TravelSchedule[]> => {
  try {
    // Get transport settings for all users
    const userIds = invitedFriends.map(f => f.id);
    const transportSettings = await fetchUsersTransportSettings(userIds, token);

    // Generate schedules for each friend
    const schedules: TravelSchedule[] = [];
    
    for (const friend of invitedFriends) {
      // If starting location is provided, use it for all friends
      // Otherwise, each friend needs their own home location
      const hasValidOrigin = startingLocation || (friend.lat && friend.lng);
      
      if (hasValidOrigin) {
        const userTransportModes = transportSettings[friend.id] || ['driving'];
        const schedule = await generateUserTravelSchedule(
          friend,
          eventLocation,
          eventStart,
          eventEnd,
          userTransportModes,
          token,
          startingLocation
        );
        
        if (schedule) {
          schedules.push(schedule);
        }
      }
    }

    return schedules;
  } catch (error) {
    console.error('Error generating travel schedules:', error);
    return [];
  }
};