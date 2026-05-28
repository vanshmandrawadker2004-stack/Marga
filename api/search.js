require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

// Initialize the official Google Gen AI SDK
const ai = new GoogleGenAI({});

module.exports = async function handler(req, res) {
    // Security & Preflight CORS setup
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Satisfy preflight checks immediately
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is missing' });
        }

        const systemInstruction = `
       You are the core routing engine for TorqueTrails, a premium motorcycle touring app in Pune, India.
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
        res.status(200).json(JSON.parse(rawText));

    } catch (error) {
        console.error("Gemini routing pipeline error:", error);
        return res.status(500).json({ 
            error: "Failed to process the riding request.",
            details: error.message 
        });
    }
}
