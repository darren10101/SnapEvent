const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OpenAI = require('openai');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

router.post('/suggest/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000 });
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

    // Google Places helpers
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    async function placesAutocomplete({ input, originLat, originLng, radiusMeters }) {
      if (!googleKey) return { predictions: [], error: 'GOOGLE_MAPS_API_KEY not configured' };
      const params = new URLSearchParams({ input, key: googleKey });
      if (typeof originLat === 'number' && typeof originLng === 'number') {
        params.set('location', `${originLat},${originLng}`);
        if (typeof radiusMeters === 'number' && radiusMeters > 0) params.set('radius', String(Math.min(radiusMeters, 50000)));
      }
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== 'OK') return { predictions: [], status: data.status, error_message: data.error_message };
      return {
        predictions: (data.predictions || []).map(p => ({
          placeId: p.place_id,
          primary: p.structured_formatting?.main_text || p.description,
          secondary: p.structured_formatting?.secondary_text,
          description: p.description,
        }))
      };
    }

    async function placeDetails({ placeId }) {
      if (!googleKey) return { error: 'GOOGLE_MAPS_API_KEY not configured' };
      const params = new URLSearchParams({ place_id: placeId, key: googleKey, fields: 'geometry,name,formatted_address' });
      const url = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== 'OK') return { status: data.status, error_message: data.error_message };
      const loc = data.result?.geometry?.location;
      return {
        name: data.result?.name,
        formattedAddress: data.result?.formatted_address,
        location: loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' ? { lat: loc.lat, lng: loc.lng } : null,
      };
    }

    // Tools schema for function-calling
    const tools = [
      {
        type: 'function',
        function: {
          name: 'places_autocomplete',
          description: 'Query Google Places Autocomplete with optional location bias. Returns predictions.',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' },
              originLat: { type: 'number' },
              originLng: { type: 'number' },
              radiusMeters: { type: 'number' },
            },
            required: ['input'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'place_details',
          description: 'Fetch place details by placeId including lat/lng and formatted address.',
          parameters: {
            type: 'object',
            properties: { placeId: { type: 'string' } },
            required: ['placeId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'display_suggestions',
          description: 'Return final event suggestions. Use this to output the final JSON.',
          parameters: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    friends: {
                      type: 'array',
                      items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id','name'] }
                    },
                    location: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        lat: { type: 'number' },
                        lng: { type: 'number' },
                        placeId: { type: 'string' }
                      },
                      required: ['description','lat','lng']
                    },
                    tags: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['title','startTime','endTime','location']
                }
              }
            },
            required: ['suggestions']
          }
        }
      }
    ];

    const system = [
      'You are an event planning assistant.',
      'Use the provided tools to find places and addresses. Do not ask the user questions.',
      'Return 3-6 event suggestions by calling the display_suggestions tool. Output must only be via that tool.'
    ].join(' ');

    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: `UserId: ${userId}. Prompt: ${prompt}. Generate suggestions without asking questions.` }
    ];

    const traces = [];
    let suggestions = null;
    let running = messages;

    for (let i = 0; i < 3; i++) {
      const completion = await client.chat.completions.create({
        model,
        messages: running,
        tools,
        tool_choice: 'auto',
      });
      const msg = completion?.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls || [];
      traces.push({ type: 'assistant', content: msg?.content || null, toolCalls: toolCalls.map(tc => ({ name: tc.function?.name })) });
      if (toolCalls.length === 0) break;

      running = running.concat(msg);
      for (const call of toolCalls) {
        const name = call.function?.name;
        let args = {};
        try { args = call.function?.arguments ? JSON.parse(call.function.arguments) : {}; } catch {}
        let result;
        if (name === 'places_autocomplete') {
          result = await placesAutocomplete(args);
        } else if (name === 'place_details') {
          result = await placeDetails(args);
        } else if (name === 'display_suggestions') {
          suggestions = Array.isArray(args?.suggestions) ? args.suggestions : [];
          return res.json({ success: true, data: { suggestions, traces } });
        } else {
          result = { error: `Unknown tool: ${name}` };
        }
        traces.push({ type: 'tool_result', name, keys: typeof result === 'object' ? Object.keys(result) : [] });
        running = running.concat({ role: 'tool', tool_call_id: call.id, name, content: JSON.stringify(result) });
      }
    }

    // Fallback if the model didn't call display_suggestions
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      const now = new Date();
      const end = new Date(now.getTime() + 60*60*1000);
      suggestions = [{
        title: 'Catch up at a nearby cafe',
        description: 'Auto-suggested event',
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        friends: [],
        location: { description: 'Your area', lat: 0, lng: 0 },
        tags: ['fallback']
      }];
    }

    res.json({ success: true, data: { suggestions, traces } });
  } catch (error) {
    console.error('Event suggestions error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate suggestions', error: error?.message || 'unknown_error' });
  }
});

module.exports = router;