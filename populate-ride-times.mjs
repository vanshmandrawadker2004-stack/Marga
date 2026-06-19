import fetch from 'node-fetch';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// 🛑 INITIALIZE ENVIRONMENT VARIABLES & FIREBASE 🛑
dotenv.config();

const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fixed origin for all ride-time calculations: Pune (lat, lng)
const PUNE_LAT = 18.5204;
const PUNE_LNG = 73.8567;

// --- THE RIDE TIME ENGINE: Mapbox Directions API ---
// Returns driving duration in whole minutes from Pune to the trail, or null on failure.
async function getRideTimeMinutes(destLat, destLng) {
    // Mapbox expects coordinates as lng,lat. Origin first, then destination.
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${PUNE_LNG},${PUNE_LAT};${destLng},${destLat}?overview=false&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(data.message || data.code || 'No route returned');
    }

    // route.duration is in seconds.
    return Math.round(data.routes[0].duration / 60);
}

// --- THE FIREBASE BACKFILL LOOP ---
async function populateRideTimes() {
    console.log(`\n🏍️  POPULATING RIDE TIMES (origin: Pune ${PUNE_LAT}, ${PUNE_LNG})...\n`);

    if (!MAPBOX_TOKEN) {
        console.error('❌ MAPBOX_TOKEN missing from environment (.env). Aborting.');
        return;
    }

    const snapshot = await db.collection('trails').get();
    console.log(`📂 Loaded ${snapshot.size} trail documents from Firestore.\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
        const trail = doc.data();
        const name = trail.locationName || doc.id;
        const lat = trail.latitude;
        const lng = trail.longitude;

        if (typeof lat !== 'number' || typeof lng !== 'number') {
            console.log(`    ⏭️  Skipped "${name}": missing/invalid coordinates.`);
            skipped++;
            continue;
        }

        try {
            const minutes = await getRideTimeMinutes(lat, lng);
            await doc.ref.update({ rideTimeMinutes: minutes });

            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            const pretty = h > 0 ? `${h}h ${m}m` : `${m}m`;
            console.log(`    ✔️  "${name}" → ${minutes} min (${pretty})`);
            updated++;
        } catch (error) {
            console.log(`    ⚠️  Failed "${name}": ${error.message}`);
            failed++;
        }

        // Be gentle on the Mapbox rate limit.
        await sleep(500);
    }

    console.log(`\n🏁 DONE. Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed}`);
}

// 🎯 RUN IT
populateRideTimes()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
