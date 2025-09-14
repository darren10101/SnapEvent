const OpenAI = require('openai');
const DynamoDBService = require('./dynamodb');
const GoogleDirectionsService = require('./googleDirections');

class OpenAIAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Initialize DynamoDB services
    this.usersDB = new DynamoDBService(process.env.USERS_TABLE || 'snapevent-users');
    this.eventsDB = new DynamoDBService(process.env.EVENTS_TABLE || 'snapevent-events');
    
    // Agent configuration
    this.systemPrompt = `You are an intelligent assistant for SnapEvent, a location-based social app. 
    You help users manage their events, friends, and location-based interactions.
    
    You have access to the following capabilities:
    - Get user information and profile data
    - Fetch user's friends list
    - Get event information and manage events
    - Calculate travel times and directions between locations
    - Analyze location patterns and provide recommendations
    
    Always be helpful, friendly, and provide accurate information based on the available data.
    When you don't have access to specific information, let the user know what you can help with instead.`;
    
    // Available functions that the agent can call
    this.functions = [
      {
        name: "get_user_profile",
        description: "Get detailed information about a user's profile",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "The ID of the user to fetch profile for"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_user_friends",
        description: "Get a list of user's friends with their information",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "The ID of the user to fetch friends for"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "get_user_events",
        description: "Get a list of user's events",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "The ID of the user to fetch events for"
            }
          },
          required: ["userId"]
        }
      },
      {
        name: "calculate_travel_time",
        description: "Calculate travel time between two locations",
        parameters: {
          type: "object",
          properties: {
            origin: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" }
              },
              required: ["lat", "lng"]
            },
            destination: {
              type: "object",
              properties: {
                lat: { type: "number" },
                lng: { type: "number" }
              },
              required: ["lat", "lng"]
            },
            transportModes: {
              type: "array",
              items: { type: "string" },
              description: "Array of transport modes to check (driving, walking, transit, bicycling)"
            }
          },
          required: ["origin", "destination", "transportModes"]
        }
      },
      {
        name: "analyze_friend_proximity",
        description: "Analyze which friends are closest to a user's location",
        parameters: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "The ID of the user to analyze proximity for"
            },
            maxDistance: {
              type: "number",
              description: "Maximum distance in kilometers (optional, default 50)"
            }
          },
          required: ["userId"]
        }
      }
    ];
  }

  // Main chat completion method with function calling
  async chat(messages, userId = null) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          { role: "system", content: this.systemPrompt },
          ...messages
        ],
        functions: this.functions,
        function_call: "auto",
        temperature: 0.7,
        max_tokens: 1000
      });

      const message = completion.choices[0].message;

      // Check if the model wants to call a function
      if (message.function_call) {
        const functionName = message.function_call.name;
        const functionArgs = JSON.parse(message.function_call.arguments);
        
        // Execute the function
        const functionResult = await this.executeFunction(functionName, functionArgs, userId);
        
        // Add function call and result to conversation
        messages.push(message);
        messages.push({
          role: "function",
          name: functionName,
          content: JSON.stringify(functionResult)
        });

        // Get final response with function result
        const finalCompletion = await this.openai.chat.completions.create({
          model: "gpt-4-1106-preview",
          messages: [
            { role: "system", content: this.systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 1000
        });

        return {
          message: finalCompletion.choices[0].message.content,
          functionCall: {
            name: functionName,
            arguments: functionArgs,
            result: functionResult
          }
        };
      }

      return {
        message: message.content,
        functionCall: null
      };

    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw error;
    }
  }

  // Execute function calls
  async executeFunction(functionName, args, userId) {
    switch (functionName) {
      case 'get_user_profile':
        return await this.getUserProfile(args.userId);
      
      case 'get_user_friends':
        return await this.getUserFriends(args.userId);
      
      case 'get_user_events':
        return await this.getUserEvents(args.userId);
      
      case 'calculate_travel_time':
        return await this.calculateTravelTime(args.origin, args.destination, args.transportModes);
      
      case 'analyze_friend_proximity':
        return await this.analyzeFriendProximity(args.userId, args.maxDistance);
      
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  // Function implementations
  async getUserProfile(userId) {
    try {
      const user = await this.usersDB.getItem({ id: userId });
      if (!user) {
        return { error: "User not found" };
      }
      
      // Return relevant profile information (excluding sensitive data)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        location: user.lat && user.lng ? { lat: user.lat, lng: user.lng } : null,
        transportModes: user.transportModes || [],
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { error: "Failed to fetch user profile" };
    }
  }

  async getUserFriends(userId) {
    try {
      // Get user to access their friends list
      const user = await this.usersDB.getItem({ id: userId });
      if (!user) {
        return { error: "User not found" };
      }

      const friendIds = user.friends || [];
      
      if (friendIds.length === 0) {
        return { friends: [] };
      }

      // Get friend details
      const friendsPromises = friendIds.map(friendId => this.usersDB.getItem({ id: friendId }));
      const friends = await Promise.all(friendsPromises);
      
      // Filter out any null results and return friend information
      const validFriends = friends.filter(friend => friend !== null);

      return {
        friends: validFriends.map(friend => ({
          id: friend.id,
          name: friend.name,
          email: friend.email,
          picture: friend.picture,
          location: friend.lat && friend.lng ? { lat: friend.lat, lng: friend.lng } : null,
          status: friend.status
        }))
      };
    } catch (error) {
      console.error('Error getting user friends:', error);
      return { error: "Failed to fetch user friends" };
    }
  }

  async getUserEvents(userId) {
    try {
      // Query events where the user is the creator or attendee
      // Since we don't have a direct user-events relationship in the current schema,
      // we'll scan the events table for events where the user is involved
      const allEvents = await this.eventsDB.scanTable();
      
      if (!allEvents || allEvents.length === 0) {
        return { events: [] };
      }

      // Filter events where user is creator or attendee
      const userEvents = allEvents.filter(event => {
        return event.createdBy === userId || 
               (event.attendees && event.attendees.includes(userId));
      });

      return {
        events: userEvents.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          location: event.location,
          attendees: event.attendees || []
        }))
      };
    } catch (error) {
      console.error('Error getting user events:', error);
      return { error: "Failed to fetch user events" };
    }
  }

  async calculateTravelTime(origin, destination, transportModes) {
    try {
      const googleDirections = new GoogleDirectionsService();
      const results = {};

      for (const mode of transportModes) {
        try {
          const result = await googleDirections.getDirections(origin, destination, mode);
          if (result && result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const leg = route.legs[0];
            
            results[mode] = {
              duration: leg.duration.text,
              distance: leg.distance.text,
              durationValue: leg.duration.value,
              distanceValue: leg.distance.value
            };
          }
        } catch (modeError) {
          console.error(`Error calculating ${mode} directions:`, modeError);
          results[mode] = { error: `Failed to calculate ${mode} directions` };
        }
      }

      return results;
    } catch (error) {
      console.error('Error calculating travel time:', error);
      return { error: "Failed to calculate travel time" };
    }
  }

  async analyzeFriendProximity(userId, maxDistance = 50) {
    try {
      const user = await this.getUserProfile(userId);
      const friendsData = await this.getUserFriends(userId);

      if (!user.location) {
        return { error: "User location not available" };
      }

      if (!friendsData.friends || friendsData.friends.length === 0) {
        return { nearbyFriends: [], message: "No friends found" };
      }

      const nearbyFriends = [];
      
      for (const friend of friendsData.friends) {
        if (!friend.location) continue;

        // Calculate straight-line distance
        const distance = this.calculateDistance(
          user.location.lat, user.location.lng,
          friend.location.lat, friend.location.lng
        );

        if (distance <= maxDistance) {
          nearbyFriends.push({
            ...friend,
            distance: Math.round(distance * 10) / 10 // Round to 1 decimal
          });
        }
      }

      // Sort by distance
      nearbyFriends.sort((a, b) => a.distance - b.distance);

      return {
        nearbyFriends,
        totalFriends: friendsData.friends.length,
        friendsWithLocation: friendsData.friends.filter(f => f.location).length,
        searchRadius: maxDistance
      };
    } catch (error) {
      console.error('Error analyzing friend proximity:', error);
      return { error: "Failed to analyze friend proximity" };
    }
  }

  // Helper function to calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Generate response for simple questions without function calls
  async simpleChat(message, userId = null) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      return {
        message: completion.choices[0].message.content,
        functionCall: null
      };
    } catch (error) {
      console.error('OpenAI simple chat error:', error);
      throw error;
    }
  }
}

module.exports = OpenAIAgent;