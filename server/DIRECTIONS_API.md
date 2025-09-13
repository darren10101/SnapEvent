# SnapEvent Directions API Documentation

## Overview
The Directions API provides route planning, travel time calculations, and group itinerary optimization using Google Maps services.

## Base URL
```
http://localhost:3000/api/directions
```

## Authentication
All endpoints (except `/modes`) require JWT authentication via the `Authorization` header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. Calculate Route
**POST** `/route`

Calculate directions between two points with optional waypoints.

**Request Body:**
```json
{
  "origin": "37.7749,-122.4194",  // Required: lat,lng or address
  "destination": "37.7849,-122.4094",  // Required: lat,lng or address
  "mode": "driving",  // Optional: driving, walking, transit, bicycling
  "departure_time": "now",  // Optional: timestamp or "now"
  "arrival_time": 1609459200,  // Optional: timestamp
  "waypoints": ["37.7799,-122.4144"],  // Optional: array of waypoints
  "optimize_waypoints": true,  // Optional: optimize waypoint order
  "avoid": "tolls,highways"  // Optional: tolls, highways, ferries, indoor
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [{
      "summary": "I-280 N",
      "distance": 15420,
      "duration": 1200,
      "distanceText": "15.4 km",
      "durationText": "20 mins",
      "startAddress": "San Francisco, CA",
      "endAddress": "San Francisco, CA",
      "polyline": "encoded_polyline_string",
      "legs": [...]
    }]
  },
  "message": "Route calculated successfully"
}
```

### 2. Distance Matrix
**POST** `/matrix`

Calculate travel times and distances between multiple origins and destinations.

**Request Body:**
```json
{
  "origins": ["37.7749,-122.4194", "37.7849,-122.4094"],
  "destinations": ["37.7799,-122.4144", "37.7899,-122.4244"],
  "mode": "driving",
  "departure_time": "now",
  "avoid": "tolls"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originAddresses": ["San Francisco, CA", "San Francisco, CA"],
    "destinationAddresses": ["San Francisco, CA", "San Francisco, CA"],
    "rows": [{
      "elements": [{
        "status": "OK",
        "distance": { "text": "2.1 km", "value": 2100 },
        "duration": { "text": "8 mins", "value": 480 }
      }]
    }]
  }
}
```

### 3. Plan Group Itinerary
**POST** `/plan-itinerary`

Plan optimal departure times for a group meetup at a specific location and time.

**Request Body:**
```json
{
  "participants": [
    {
      "id": "user1",
      "name": "Alice",
      "lat": 37.7749,
      "lng": -122.4194
    },
    {
      "id": "user2", 
      "name": "Bob",
      "lat": 37.7849,
      "lng": -122.4094
    }
  ],
  "destination": "37.7799,-122.4144",
  "meetingTime": "2024-01-01T15:00:00Z",
  "mode": "driving"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingPoint": "37.7799,-122.4144",
    "meetingTime": "2024-01-01T15:00:00Z",
    "participants": [
      {
        "participantId": "user1",
        "participantName": "Alice",
        "origin": "37.7749,-122.4194",
        "destination": "37.7799,-122.4144",
        "departureTime": "2024-01-01T14:52:00Z",
        "arrivalTime": "2024-01-01T15:00:00Z",
        "travelTime": "8 mins",
        "travelTimeSeconds": 480,
        "distance": "2.1 km",
        "distanceMeters": 2100,
        "mode": "driving",
        "route": { /* detailed route object */ }
      }
    ],
    "summary": {
      "totalParticipants": 2,
      "successfulRoutes": 2,
      "averageTravelTime": 540,
      "earliestDeparture": "2024-01-01T14:45:00Z",
      "latestDeparture": "2024-01-01T14:52:00Z"
    }
  }
}
```

### 4. Find Optimal Meeting Point
**POST** `/optimal-meetup`

Find the best meeting location for a group based on their current positions.

**Request Body:**
```json
{
  "participants": [
    {
      "id": "user1",
      "name": "Alice", 
      "lat": 37.7749,
      "lng": -122.4194
    },
    {
      "id": "user2",
      "name": "Bob",
      "lat": 37.7849,
      "lng": -122.4094
    }
  ],
  "constraints": {
    "maxTravelTimeMinutes": 30,
    "searchRadius": 10000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestedMeetingPoint": {
      "location": "37.7799,-122.4144",
      "lat": 37.7799,
      "lng": -122.4144,
      "description": "Calculated centroid of all participants"
    },
    "travelTimes": [
      {
        "participantId": "user1",
        "participantName": "Alice",
        "travelTime": "5 mins",
        "travelTimeSeconds": 300,
        "distance": "1.2 km"
      }
    ],
    "summary": {
      "maxTravelTimeSeconds": 600,
      "maxTravelTimeMinutes": 10,
      "avgTravelTimeSeconds": 450,
      "avgTravelTimeMinutes": 8,
      "isWithinConstraints": true
    }
  }
}
```

### 5. Get Transportation Modes
**GET** `/modes`

Get available transportation modes (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "modes": [
      {
        "id": "driving",
        "name": "Driving",
        "description": "Travel by car",
        "icon": "🚗"
      },
      {
        "id": "walking",
        "name": "Walking", 
        "description": "Travel on foot",
        "icon": "🚶"
      },
      {
        "id": "transit",
        "name": "Public Transit",
        "description": "Travel by bus, train, etc.",
        "icon": "🚌"
      },
      {
        "id": "bicycling",
        "name": "Bicycling",
        "description": "Travel by bicycle", 
        "icon": "🚴"
      }
    ]
  }
}
```

### 6. Bulk Route Calculation
**POST** `/bulk-routes`

Calculate multiple routes at once for event planning.

**Request Body:**
```json
{
  "routes": [
    {
      "origin": "37.7749,-122.4194",
      "destination": "37.7799,-122.4144",
      "mode": "driving",
      "departure_time": "now"
    },
    {
      "origin": "37.7849,-122.4094", 
      "destination": "37.7799,-122.4144",
      "mode": "walking"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "index": 0,
        "origin": "37.7749,-122.4194",
        "destination": "37.7799,-122.4144",
        "mode": "driving",
        "result": { /* route data */ }
      }
    ],
    "summary": {
      "total": 2,
      "successful": 2,
      "failed": 0
    }
  }
}
```

## Error Responses

All endpoints return error responses in this format:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing or invalid JWT token)
- `500` - Internal Server Error

## Setup Requirements

1. **Google Maps API Key**: Set `GOOGLE_MAPS_API_KEY` in your `.env` file
2. **Enable APIs**: Enable the following in Google Cloud Console:
   - Directions API
   - Distance Matrix API
   - Roads API (optional, for better routing)

## Usage Examples

### Planning a Group Meetup

1. **Find optimal meeting point:**
   ```javascript
   const response = await fetch('/api/directions/optimal-meetup', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer ' + token,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       participants: [
         { id: 'user1', name: 'Alice', lat: 37.7749, lng: -122.4194 },
         { id: 'user2', name: 'Bob', lat: 37.7849, lng: -122.4094 }
       ]
     })
   });
   ```

2. **Plan departure times:**
   ```javascript
   const response = await fetch('/api/directions/plan-itinerary', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer ' + token,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       participants: participants,
       destination: meetingPoint,
       meetingTime: '2024-01-01T15:00:00Z',
       mode: 'driving'
     })
   });
   ```

### Integration with Events

The directions API integrates with your events system. When creating events, you can:

1. Use `/optimal-meetup` to suggest meeting locations
2. Use `/plan-itinerary` to calculate when participants should leave
3. Use `/bulk-routes` to calculate routes for all participants
4. Store route information in the event's itinerary

This enables features like:
- Automatic departure time notifications
- Real-time traffic updates
- Alternative route suggestions
- Group coordination and timing optimization