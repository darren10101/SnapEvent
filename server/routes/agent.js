const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OpenAIAgent = require('../services/openaiAgent');

// Initialize the OpenAI agent
const agent = new OpenAIAgent();

// Conversation storage (in production, this should be in a database)
const conversations = new Map();

/**
 * POST /api/agent/chat
 * Main chat endpoint with conversation management
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Get or create conversation
    const convId = conversationId || `${userId}_${Date.now()}`;
    let conversation = conversations.get(convId) || [];

    // Add user message to conversation
    conversation.push({ role: 'user', content: message });

    // Get response from agent
    const response = await agent.chat(conversation, userId);

    // Add assistant response to conversation
    conversation.push({ role: 'assistant', content: response.message });

    // Store conversation (limit to last 20 messages to prevent memory issues)
    if (conversation.length > 20) {
      conversation = conversation.slice(-20);
    }
    conversations.set(convId, conversation);

    res.json({
      success: true,
      data: {
        message: response.message,
        conversationId: convId,
        functionCall: response.functionCall,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Agent chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/agent/simple-chat
 * Simple chat without conversation history
 */
router.post('/simple-chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const response = await agent.simpleChat(message, userId);

    res.json({
      success: true,
      data: {
        message: response.message,
        functionCall: response.functionCall,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Agent simple chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/agent/conversation/:conversationId
 * Get conversation history
 */
router.get('/conversation/:conversationId', authenticateToken, (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = conversations.get(conversationId) || [];

    res.json({
      success: true,
      data: {
        conversationId,
        messages: conversation,
        messageCount: conversation.length
      }
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation'
    });
  }
});

/**
 * DELETE /api/agent/conversation/:conversationId
 * Clear conversation history
 */
router.delete('/conversation/:conversationId', authenticateToken, (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Check if conversation belongs to user
    if (!conversationId.startsWith(userId + '_')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    conversations.delete(conversationId);

    res.json({
      success: true,
      message: 'Conversation cleared successfully'
    });

  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversation'
    });
  }
});

/**
 * GET /api/agent/conversations
 * Get all conversations for a user
 */
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userConversations = [];

    for (const [convId, messages] of conversations.entries()) {
      if (convId.startsWith(userId + '_')) {
        userConversations.push({
          conversationId: convId,
          messageCount: messages.length,
          lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
          lastActivity: convId.split('_')[1] // Extract timestamp from ID
        });
      }
    }

    // Sort by last activity (most recent first)
    userConversations.sort((a, b) => b.lastActivity - a.lastActivity);

    res.json({
      success: true,
      data: {
        conversations: userConversations,
        totalConversations: userConversations.length
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations'
    });
  }
});

/**
 * POST /api/agent/analyze/friends
 * Analyze friend proximity and travel times
 */
router.post('/analyze/friends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { maxDistance } = req.body;

    const analysis = await agent.analyzeFriendProximity(userId, maxDistance);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Friend analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze friends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/agent/calculate/travel
 * Calculate travel time between two points
 */
router.post('/calculate/travel', authenticateToken, async (req, res) => {
  try {
    const { origin, destination, transportModes } = req.body;

    if (!origin || !destination || !transportModes) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and transport modes are required'
      });
    }

    const travelData = await agent.calculateTravelTime(origin, destination, transportModes);

    res.json({
      success: true,
      data: travelData
    });

  } catch (error) {
    console.error('Travel calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate travel time',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/agent/status
 * Check agent service status
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = {
      service: 'OpenAI Agent',
      status: 'active',
      apiKeyConfigured: !!process.env.OPENAI_API_KEY,
      activeConversations: conversations.size,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check agent status'
    });
  }
});

/**
 * POST /api/agent/suggest/meetup
 * Suggest optimal meetup locations for friends
 */
router.post('/suggest/meetup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendIds, preferences } = req.body;

    // This would be a more complex function that analyzes multiple friend locations
    // and suggests optimal meetup points based on travel times and preferences
    const suggestion = await agent.chat([
      { 
        role: 'user', 
        content: `Help me find a good meetup location with my friends. My user ID is ${userId} and I want to meet with friends: ${friendIds?.join(', ') || 'all my friends'}. Preferences: ${JSON.stringify(preferences || {})}` 
      }
    ], userId);

    res.json({
      success: true,
      data: {
        suggestion: suggestion.message,
        functionCall: suggestion.functionCall,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Meetup suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suggest meetup location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;