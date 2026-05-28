require('dotenv').config();
const express = require('express');
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json());
app.use(express.static('.')); // Serves frontend files

const ai = new GoogleGenAI({});

app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query missing' });

        const systemInstruction = `
       You are the core routing engine for TorqueTrails, a premium motorcycle touring app in Pune, India.
       Identify the single best matching real-world geographical location or trail near Pune (within 150km) based on the user's vibe request.
       CRITICAL: Use your live Google Search tool to verify the exact, real-world latitude and longitude. Do not hallucinate.
       CRITICAL OUTPUT FORMAT: You MUST respond strictly with a raw JSON object and absolutely nothing else. No markdown, no backticks, no conversational text.
       Use this exact schema: {"matchedLocation": "string", "latitude": number, "longitude": number, "aiReasoning": "string", "recommendedChaiStop": "string", "bestTimeToVisit": "string", "travelDuration": "string"}
   `;

        /*
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
        */

        const dummyData = {
            matchedLocation: "Tamhini Ghat (UI Test Mode)",
            latitude: 18.4485,
            longitude: 73.4173,
            aiReasoning: "This is a simulated AI response to test the neon map lines without using API quota.",
            recommendedChaiStop: "Paradise Cafe Tapri",
            bestTimeToVisit: "6:00 AM",
            travelDuration: "1.5 hours"
        };
        return res.status(200).json(dummyData);

    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ error: "Failed to process the riding request." });
    }
});

app.listen(3000, () => console.log('TorqueTrails running smoothly on http://localhost:3000'));
