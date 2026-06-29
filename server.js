require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // Serves frontend files

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

// --- OVERPASS API PROXY ---
// GET /api/overpass?query=...
// Tries multiple Overpass mirrors until one responds.
app.get('/api/overpass', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required.' });

    const mirrors = [
        'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass-api.de/api/interpreter',
    ];

    for (const mirror of mirrors) {
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 8000);
            const opRes = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, { signal: controller.signal });
            clearTimeout(tid);
            if (opRes.ok) {
                const data = await opRes.json();
                return res.status(200).json(data);
            }
        } catch (err) {
            console.log(`Overpass mirror ${mirror} failed: ${err.message}`);
        }
    }

    res.status(502).json({ error: 'All Overpass mirrors failed.' });
});

app.listen(3000, () => console.log('Marga running on http://localhost:3000'));
