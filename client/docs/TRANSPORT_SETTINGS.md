# Transportation Settings Feature

This feature allows users to configure their preferred transportation modes for route planning and navigation throughout the SnapEvent app. **Settings are now persisted to the database and synchronized across devices.**

## Overview

The transportation settings are stored both locally (AsyncStorage) and remotely (DynamoDB via API) to provide:
- **Cross-device synchronization**: Settings sync when users log in on different devices
- **Offline capability**: Local storage ensures the app works without internet
- **Data persistence**: Settings are permanently stored in the user's profile

## Available Transport Modes

- **Walking** (`walking`) - For pedestrian routes
- **Driving** (`driving`) - For car routes  
- **Public Transit** (`transit`) - For public transportation routes
- **Bicycling** (`bicycling`) - For bicycle routes

## Usage

### In Profile Settings

Users can manage their transportation preferences in the Profile section:
1. Navigate to Profile tab
2. Find "Transportation Modes" section
3. Select/deselect preferred modes by tapping them
4. Settings are automatically saved to both local storage and database

### In Code

#### Import the utilities:
```typescript
import { 
  getTransportModes, 
  setTransportModes, 
  getPrimaryTransportMode,
  isTransportModeEnabled,
  syncTransportModes 
} from '../lib/transportSettings';
```

#### Get user's preferred modes (tries server first, falls back to local):
```typescript
const userModes = await getTransportModes();
// Returns: ['driving', 'walking'] (example)
```

#### Sync with server explicitly:
```typescript
const syncedModes = await syncTransportModes();
// Fetches from server and updates local storage
```

#### Get primary mode for default routing:
```typescript
const primaryMode = await getPrimaryTransportMode();
// Returns: 'driving' (first selected mode)
```

#### Check if specific mode is enabled:
```typescript
const canWalk = await isTransportModeEnabled('walking');
// Returns: true/false
```

#### Update preferences (saves to both server and local):
```typescript
await setTransportModes(['walking', 'transit']);
```

#### Using the React Hook:
```typescript
import { useTransportSettings } from '../lib/hooks/useTransportSettings';

function MyComponent() {
  const { 
    transportModes, 
    loading, 
    syncing, 
    error, 
    toggleTransportMode,
    syncWithServer 
  } = useTransportSettings();
  
  // Manual sync with server
  const handleSync = () => {
    syncWithServer();
  };
  
  return (
    <div>
      {loading && <p>Loading transport settings...</p>}
      {syncing && <p>Syncing with server...</p>}
      {error && <p>Error: {error}</p>}
      {/* Your UI */}
    </div>
  );
}
```

## API Endpoints

### Get Transport Settings
```
GET /api/users/:googleId/transport-settings
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "transportModes": ["driving", "walking"],
    "primaryMode": "driving"
  }
}
```

### Update Transport Settings
```
PUT /api/users/:googleId/transport-settings
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "transportModes": ["driving", "walking", "bicycling"]
}

Response:
{
  "success": true,
  "data": {
    "transportModes": ["driving", "walking", "bicycling"],
    "primaryMode": "driving"
  },
  "message": "Transport settings updated successfully"
}
```

## Integration with Directions API

When making requests to the directions service, use the user's preferences:

```typescript
// Example: Get directions using user's primary transport mode
const primaryMode = await getPrimaryTransportMode();

const directionsResponse = await fetch('/api/directions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: 'start location',
    destination: 'end location',
    mode: primaryMode, // Uses user's preferred mode
  })
});
```

## Synchronization Behavior

1. **On App Start**: Settings sync from server to local storage
2. **On Login**: Settings sync from server to local storage  
3. **On Setting Change**: Settings save to both local storage and server
4. **Offline Mode**: Changes save locally and sync when connection returns
5. **Conflict Resolution**: Server data takes precedence over local data

## Benefits

1. **Cross-Device Sync**: Settings follow users across all their devices
2. **Personalized Experience**: Routes match user's actual transportation capabilities
3. **Better Route Planning**: Event organizers can see realistic travel times
4. **Accessibility**: Users can specify their preferred/available transport methods
5. **Offline Support**: App works without internet connection
6. **Data Persistence**: Settings never lost, even if local storage is cleared

## Technical Details

- **Local Storage**: AsyncStorage with key `transportModes`
- **Database**: DynamoDB `transportModes` field in user table
- **API**: RESTful endpoints with JWT authentication
- **Default**: `['driving']` if no preferences set
- **Validation**: Ensures at least one mode is always selected
- **Type Safety**: Full TypeScript support with proper types
- **Error Handling**: Graceful fallbacks for network issues

## Database Schema

The `transportModes` field is added to the user table:

```javascript
{
  id: "google_user_id",           // Primary key
  email: "user@example.com",
  name: "John Doe",
  picture: "https://...",
  transportModes: [               // New field
    "driving", 
    "walking"
  ],
  // ... other user fields
}
```

## Future Enhancements

Potential improvements for this feature:
- Integration with device location services for mode suggestions
- Time-based mode preferences (walking during day, driving at night)
- Event-specific mode overrides
- Public transit integration with real-time schedules
- Accessibility options (wheelchair-accessible routes)
- Smart suggestions based on weather and distance