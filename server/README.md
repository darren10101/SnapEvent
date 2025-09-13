# SnapEvent Server

A barebones Express.js server for the SnapEvent application with DynamoDB integration.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm
- AWS Account with DynamoDB access
- AWS CLI configured (optional but recommended)

### Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your AWS credentials and configuration:
   ```
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   EVENTS_TABLE=snapevent-events
   USERS_TABLE=snapevent-users
   PORT=3000
   ```

### DynamoDB Setup

#### Option 1: Using AWS Console
1. Go to AWS DynamoDB Console
2. Create two tables:
   - **Events Table**: `snapevent-events` with partition key `id` (String)
   - **Users Table**: `snapevent-users` with partition key `id` (String)
3. Use default settings for other options

#### Option 2: Using AWS CLI
```bash
# Create Events table
aws dynamodb create-table \
    --table-name snapevent-events \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# Create Users table
aws dynamodb create-table \
    --table-name snapevent-users \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

### Running the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on port 3000 by default. You can access it at `http://localhost:3000`.

## Available Endpoints

### General
- `GET /` - Welcome message and server status
- `GET /health` - Health check endpoint

### Events API
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get a specific event by ID
- `POST /api/events` - Create a new event
- `PUT /api/events/:id` - Update an existing event
- `DELETE /api/events/:id` - Delete an event
- `POST /api/events/:id/participants` - Add participants to an event
- `PUT /api/events/:id/itinerary/:userId` - Set itinerary for a specific user
- `GET /api/events/:id/itinerary/:userId` - Get itinerary for a specific user

### Users API
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user by ID
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update an existing user
- `DELETE /api/users/:id` - Delete a user
- `PUT /api/users/:id/location` - Update user's current location
- `POST /api/users/:id/availability` - Add availability window for a user
- `DELETE /api/users/:id/availability/:index` - Remove specific availability window
- `POST /api/users/:id/friends` - Add friends to a user
- `DELETE /api/users/:id/friends/:friendId` - Remove a friend from user's friends list
- `GET /api/users/:id/friends` - Get user's friends with their details

### Event Data Structure
```json
{
  "id": "e1234567890_abc123",
  "name": "Dinner at Union Station",
  "location": {
    "lat": 43.645,
    "lng": -79.380
  },
  "start": "2025-09-12T19:00:00Z",
  "end": "2025-09-12T21:00:00Z",
  "createdBy": "u1",
  "participants": ["u1", "u2"],
  "itineraries": {
    "u1": {
      "steps": [
        {
          "mode": "walk",
          "from": { "lat": 43.6532, "lng": -79.3832 },
          "to": { "lat": 43.6500, "lng": -79.3800 },
          "departureTime": "2025-09-12T18:30:00Z",
          "arrivalTime": "2025-09-12T18:40:00Z",
          "details": "Walk to King St. Station"
        },
        {
          "mode": "bus",
          "route": "501 Queen",
          "from": { "lat": 43.6500, "lng": -79.3800 },
          "to": { "lat": 43.645, "lng": -79.380 },
          "departureTime": "2025-09-12T18:45:00Z",
          "arrivalTime": "2025-09-12T18:55:00Z",
          "details": "Take 501 Queen westbound"
        }
      ]
    }
  }
}
```

### User Data Structure
```json
{
  "id": "u1234567890_abc123",
  "name": "Alice",
  "lat": 43.6532,
  "lng": -79.3832,
  "availability": [
    {
      "start": "2025-09-12T15:00:00Z",
      "end": "2025-09-12T18:00:00Z",
      "location": {
        "lat": 43.6601,
        "lng": -79.3957
      }
    }
  ],
  "friends": ["u2", "u3"]
}
```

## DynamoDB Service

The `DynamoDBService` class provides the following methods:

- `putItem(item)` - Create/Put an item
- `getItem(key)` - Get an item by key
- `updateItem(key, updateExpression, expressionAttributeValues, expressionAttributeNames)` - Update an item
- `deleteItem(key)` - Delete an item
- `scanTable(filterExpression, expressionAttributeValues, limit)` - Scan all items
- `queryItems(keyConditionExpression, expressionAttributeValues, expressionAttributeNames, limit)` - Query items
- `batchWrite(items, deleteKeys)` - Batch write operations

### Usage Example

```javascript
const DynamoDBService = require('./services/dynamodb');

// Initialize service for a specific table
const eventsDB = new DynamoDBService('snapevent-events');

// Create an item
await eventsDB.putItem({
  id: 'event123',
  name: 'My Event',
  date: '2025-12-31'
});

// Get an item
const event = await eventsDB.getItem({ id: 'event123' });

// Update an item
await eventsDB.updateItem(
  { id: 'event123' },
  'SET #name = :name',
  { ':name': 'Updated Event Name' },
  { '#name': 'name' }
);
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `EVENTS_TABLE` - DynamoDB events table name
- `USERS_TABLE` - DynamoDB users table name

## Project Structure

```
server/
├── services/
│   └── dynamodb.js      # DynamoDB service module
├── routes/
│   └── events.js        # Events API routes
├── index.js             # Main server file
├── package.json         # Dependencies and scripts
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Security Notes

- Never commit your `.env` file to version control
- Use IAM roles with minimal required permissions
- Consider using AWS STS for temporary credentials in production
- Implement proper input validation and sanitization