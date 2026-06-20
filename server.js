require('dotenv').config();
const express = require('express');
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Serves frontend files

const ai = new GoogleGenAI({});

app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query missing' });

        const systemInstruction = `
       You are the core routing engine for Marga, a premium motorcycle discovery app in Pune, India.
       Identify the single best matching real-world geographical location or trail near Pune (within 150km) based on the user's vibe request.
       CRITICAL: Use your live Google Search tool to verify the exact, real-world latitude and longitude. Do not hallucinate.
       CRITICAL OUTPUT FORMAT: You MUST respond strictly with a raw JSON object and absolutely nothing else. No markdown, no backticks, no conversational text.
       Use this exact schema: {"matchedLocation": "string", "latitude": number, "longitude": number, "aiReasoning": "string", "recommendedChaiStop": "string", "bestTimeToVisit": "string", "travelDuration": "string"}
   `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The rider is requesting this vibe: "${query}"`,
            config: {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
                temperature: 0.2,
            }
        });

        let rawText = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        return res.status(200).json(JSON.parse(rawText));

    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Failed to process the riding request." });
    }
});

// --- PUBLIC CONFIG: hands the frontend only what it needs (the Mapbox token) ---
app.get('/api/config', (req, res) => {
    if (!process.env.MAPBOX_TOKEN) {
        return res.status(500).json({ error: 'MAPBOX_TOKEN not configured on server.' });
    }
    res.json({ mapboxToken: process.env.MAPBOX_TOKEN });
});

// --- MAPBOX DIRECTIONS PROXY ---
// GET /api/route?from=lng,lat&to=lng,lat
// Keeps the token server-side; returns the raw Mapbox Directions JSON.
app.get('/api/route', async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ error: 'Both "from" and "to" (lng,lat) are required.' });
        }

        // Validate the "lng,lat" shape so we don't forward junk to Mapbox.
        const isCoordPair = (s) => {
            const parts = String(s).split(',');
            return parts.length === 2 && parts.every(n => n.trim() !== '' && !isNaN(Number(n)));
        };
        if (!isCoordPair(from) || !isCoordPair(to)) {
            return res.status(400).json({ error: 'Coordinates must be in "lng,lat" format.' });
        }

        if (!process.env.MAPBOX_TOKEN) {
            return res.status(500).json({ error: 'MAPBOX_TOKEN not configured on server.' });
        }

        const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${from};${to}`
            + `?geometries=geojson&overview=full&access_token=${process.env.MAPBOX_TOKEN}`;

        const mbRes = await fetch(mapboxUrl);
        const data = await mbRes.json();

        // Pass Mapbox's status through so the client can react the same as before.
        res.status(mbRes.ok ? 200 : mbRes.status).json(data);
    } catch (error) {
        console.error('Mapbox proxy error:', error);
        res.status(502).json({ error: 'Failed to reach the routing service.' });
    }
});

app.listen(3000, () => console.log('Marga running on http://localhost:3000'));
