# OpenAI Agent API Documentation

## Overview
The OpenAI Agent provides intelligent assistance for SnapEvent users through natural language interaction. The agent can access user data, friend information, events, and calculate travel times to provide personalized recommendations and insights.

## Authentication
All agent endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Chat with Agent
**POST** `/api/agent/chat`

Start or continue a conversation with the AI agent.

**Request Body:**
```json
{
  "message": "How far are my friends from me?",
  "conversationId": "optional_conversation_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Based on your location and your friends' locations, here's what I found...",
    "conversationId": "user_123_1694612345678",
    "functionCall": {
      "name": "analyze_friend_proximity",
      "arguments": { "userId": "123", "maxDistance": 50 },
      "result": { "nearbyFriends": [...] }
    },
    "timestamp": "2024-09-13T10:30:00.000Z"
  }
}
```

### 2. Simple Chat
**POST** `/api/agent/simple-chat`

Send a single message without conversation history.

**Request Body:**
```json
{
  "message": "What can you help me with?"
}
```

### 3. Get Conversation History
**GET** `/api/agent/conversation/:conversationId`

Retrieve the full conversation history.

### 4. Clear Conversation
**DELETE** `/api/agent/conversation/:conversationId`

Clear a specific conversation.

### 5. List All Conversations
**GET** `/api/agent/conversations`

Get all conversations for the authenticated user.

### 6. Analyze Friends
**POST** `/api/agent/analyze/friends`

Analyze friend proximity and get detailed information.

**Request Body:**
```json
{
  "maxDistance": 25
}
```

### 7. Calculate Travel Time
**POST** `/api/agent/calculate/travel`

Calculate travel time between two locations.

**Request Body:**
```json
{
  "origin": { "lat": 43.4723, "lng": -80.5449 },
  "destination": { "lat": 43.4643, "lng": -80.5204 },
  "transportModes": ["driving", "walking", "transit"]
}
```

### 8. Suggest Meetup Location
**POST** `/api/agent/suggest/meetup`

Get AI suggestions for optimal meetup locations.

**Request Body:**
```json
{
  "friendIds": ["friend1", "friend2"],
  "preferences": {
    "type": "restaurant",
    "maxDistance": 20
  }
}
```

### 9. Agent Status
**GET** `/api/agent/status`

Check the agent service status and configuration.

## Agent Capabilities

The AI agent has access to the following functions:

### User Functions
- **get_user_profile**: Get user profile information
- **get_user_friends**: Retrieve user's friends list with locations
- **get_user_events**: Get user's events

### Analysis Functions
- **analyze_friend_proximity**: Find nearby friends within a specified radius
- **calculate_travel_time**: Calculate travel times between locations using different transport modes

### Integration Functions
The agent integrates with:
- **DynamoDB**: For user and friend data
- **Google Directions API**: For travel time calculations
- **SnapEvent Core Functions**: Event management and location services

## Example Use Cases

1. **"Where are my closest friends?"**
   - Agent calls `analyze_friend_proximity` to find nearby friends
   - Returns list of friends sorted by distance

2. **"How long would it take to get to Sarah by car?"**
   - Agent finds Sarah in your friends list
   - Calls `calculate_travel_time` with driving mode
   - Returns detailed travel information

3. **"What events do I have coming up?"**
   - Agent calls `get_user_events`
   - Returns formatted list of upcoming events

4. **"Find a good place to meet with John and Mike"**
   - Agent analyzes locations of all parties
   - Suggests optimal meetup locations based on travel times

## Environment Variables

Add to your `.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Error Handling

All endpoints return standard error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

## Rate Limiting

Consider implementing rate limiting for production use to prevent abuse of the OpenAI API.

## Security Notes

- The agent only accesses data belonging to the authenticated user
- Sensitive information (like passwords) is excluded from function responses
- Conversation history is stored in memory (consider database storage for production)
- API key should be kept secure and rotated regularly