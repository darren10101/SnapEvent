const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OpenAI = require('openai');

const usersDB = require('../services/usersDB');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


// --- gpt-5-mini suggest events implementation ---
router.post('/suggest/events', authenticateToken, async (req, res) => {
  try {

  const userId = req.user.googleId;
  var { prompt } = req.body;

    // Fetch user object from DynamoDB
    let userObj = null;
    try {
      userObj = await usersDB.getItem({ id: userId });
    } catch (e) {
      console.error('[suggest/events] Failed to fetch user from DynamoDB:', e);
    }

    if (!prompt || typeof prompt !== 'string') {
      console.log('[suggest/events] Invalid prompt:', prompt);
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });



    // Compose developer prompt with user info
    let developerPrompt = "The user is looking for event suggestions based on their interests and preferences. Please respond with a paragraph explaining where they should go (top 3 places) and why.";
    if (userObj) {
      developerPrompt += `\nUser info: ${JSON.stringify(userObj)}`;
      if (userObj.name) developerPrompt += `\nName: ${userObj.name}`;
      if (userObj.lat && userObj.lng) developerPrompt += `\nCurrent location: (${userObj.lat}, ${userObj.lng})`;
    } else {
      developerPrompt += `\nUser info: Not found in DynamoDB.`;
    }

    // Define tools for Google Maps and Google Search
    const tools = [
      {
        type: 'function',
        name: 'google_places_autocomplete',
        function: {
          name: 'google_places_autocomplete',
          description: 'Search for nearby places using Google Maps Places Autocomplete API. Returns a list of place predictions.',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Search query, e.g. cafe, park, etc.' },
              location: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
              radius: { type: 'number', description: 'Search radius in meters' }
            },
            required: ['input']
          }
        }
      },
      {
        type: 'function',
        name: 'google_search',
        function: {
          name: 'google_search',
          description: 'Search Google for information about places or events nearby. Returns a list of search results.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query, e.g. things to do near me' },
              location: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } }
            },
            required: ['query']
          }
        }
      }
    ];

    const input = [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: developerPrompt
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt
          }
        ]
      }
    ];

    console.log('[suggest/events] Request received:', { userId, prompt });
    console.log('[suggest/events] OpenAI input:', JSON.stringify(input));

    // Tool call loop for function-calling
    let runningInput = input;
    let traces = [];
    let maxSteps = 3;
    let finalResponse = null;
    let suggestions = [];
    for (let i = 0; i < maxSteps; i++) {
      const response = await openai.responses.create({
        model: 'gpt-5-mini',
        input: runningInput,
        tools,
        text: {
          format: { type: 'text' },
          verbosity: 'medium'
        },
        reasoning: { effort: 'medium' },
        store: true
      });
      console.log(`[suggest/events] OpenAI response (step ${i+1}):`, JSON.stringify(response));
      traces.push({ step: i+1, response });
      // Check for tool calls
      const toolCalls = response?.tool_calls || [];
      if (!toolCalls.length) {
        finalResponse = response;
        // Try to extract suggestions from response if present
        if (Array.isArray(response?.suggestions)) {
          suggestions = response.suggestions;
        } else if (response?.data?.suggestions) {
          suggestions = response.data.suggestions;
        }
        break;
      }
      // Handle tool calls
      for (const call of toolCalls) {
        let toolResult = null;
        console.log(`[suggest/events] Tool call:`, {
          name: call.function?.name,
          args: call.function?.arguments
        });
        if (call.function?.name === 'google_places_autocomplete') {
          // Use Google Places API for autocomplete
          const { input: placeInput, location, radius } = call.function.arguments || {};
          const googleKey = process.env.GOOGLE_MAPS_API_KEY;
          if (!googleKey) {
            toolResult = { error: 'GOOGLE_MAPS_API_KEY not configured' };
          } else {
            const params = new URLSearchParams({ input: placeInput, key: googleKey });
            if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
              params.set('location', `${location.lat},${location.lng}`);
              if (typeof radius === 'number' && radius > 0) params.set('radius', String(Math.min(radius, 50000)));
            }
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
            try {
              const resp = await fetch(url);
              const data = await resp.json();
              if (data.status !== 'OK') toolResult = { predictions: [], status: data.status, error_message: data.error_message };
              else {
                toolResult = {
                  predictions: (data.predictions || []).map(p => ({
                    placeId: p.place_id,
                    primary: p.structured_formatting?.main_text || p.description,
                    secondary: p.structured_formatting?.secondary_text,
                    description: p.description,
                  }))
                };
              }
            } catch (err) {
              toolResult = { error: err.message };
            }
          }
        } else if (call.function?.name === 'google_search') {
          // Use Bing Web Search API for real web search
          const { query } = call.function.arguments || {};
          const bingKey = process.env.BING_SEARCH_API_KEY;
          if (!bingKey) {
            toolResult = { error: 'BING_SEARCH_API_KEY not configured' };
          } else {
            const params = new URLSearchParams({ q: query, count: '5', mkt: 'en-US' });
            const url = `https://api.bing.microsoft.com/v7.0/search?${params.toString()}`;
            try {
              const resp = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': bingKey } });
              const data = await resp.json();
              if (Array.isArray(data.webPages?.value)) {
                toolResult = {
                  results: data.webPages.value.map(r => ({
                    title: r.name,
                    url: r.url,
                    snippet: r.snippet
                  }))
                };
              } else {
                toolResult = { results: [], note: 'No web results found.' };
              }
            } catch (err) {
              toolResult = { error: err.message };
            }
          }
        } else {
          toolResult = { error: 'Unknown tool' };
        }
        console.log(`[suggest/events] Tool result for ${call.function?.name}:`, toolResult);
        traces.push({ tool: call.function?.name, args: call.function?.arguments, result: toolResult });
        // Add tool result to input for next round
        runningInput = runningInput.concat({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function?.name,
          content: JSON.stringify(toolResult)
        });
      }
    }
    // Try to extract a reasoning/justification string for the frontend
    let aiReasoning = null;
    if (finalResponse?.reasoning?.explanation) {
      aiReasoning = finalResponse.reasoning.explanation;
    } else if (finalResponse?.text?.value) {
      aiReasoning = finalResponse.text.value;
    } else if (finalResponse?.text) {
      aiReasoning = finalResponse.text;
    }

    // --- Second AI call: ask for a summary paragraph using the tool results ---
    let summaryParagraph = null;
    let out = null;
    try {
      const summaryPrompt = [
        ...runningInput,
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'Given the above tool results and suggestions, write a concise summary paragraph for the user explaining the top recommended places and why they are good choices. If you bring up a location, mention the address as well. The user CANNOT respond to you, so do not ask the user any questions.'
            }
          ]
        }
      ];
      const summaryResponse = await openai.responses.create({
        model: 'gpt-5-mini',
        input: summaryPrompt,
        text: {
          format: { type: 'text' },
          verbosity: 'medium'
        },
        reasoning: { effort: 'medium' },
        store: false
      });
      console.log('[suggest/events] Full AI summary response:', JSON.stringify(summaryResponse));
      if (typeof summaryResponse === 'string') {
        summaryParagraph = summaryResponse;
      } else if (summaryResponse?.text?.value) {
        summaryParagraph = summaryResponse.text.value;
      } else if (summaryResponse?.text) {
        summaryParagraph = summaryResponse.text;
      } else if (summaryResponse?.choices?.[0]?.message?.content) {
        summaryParagraph = summaryResponse.choices[0].message.content;
      } else {
        summaryParagraph = JSON.stringify(summaryResponse);
      }
      out = summaryResponse?.output_text

      console.log(out)
      console.log('[suggest/events] AI summary paragraph (extracted):', summaryParagraph);
    } catch (err) {
      console.error('[suggest/events] Error generating summary paragraph:', err);
    }

    // Return both suggestions, reasoning, and the summary paragraph
    res.json({ success: true, data: { out, suggestions, finalResponse, aiReasoning, summaryParagraph }, traces });
  } catch (error) {
    console.error('[suggest/events] Event suggestions error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate suggestions', error: error?.message || 'unknown_error' });
  }
});

module.exports = router;