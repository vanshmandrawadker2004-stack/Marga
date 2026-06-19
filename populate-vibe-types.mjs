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

// --- THE VIBE CLASSIFICATION ENGINE ---
// Returns a vibeType based on the trail's category and description.
// Rules are evaluated top-to-bottom; first match wins.
function classifyVibe(category, description) {
    const cat = (category || '').toLowerCase();
    const desc = (description || '').toLowerCase();
    const descHas = (...words) => words.some(w => desc.includes(w));

    // 1. Twisties — mountain passes & technical tarmac
    if (cat === 'ghat' || descHas('twisty', 'hairpin', 'corners')) {
        return 'Twisties';
    }

    // 2. OffRoad — dirt, mud, rocky trails
    if (cat === 'off-road' || descHas('dirt', 'mud', 'trail', 'rocky')) {
        return 'OffRoad';
    }

    // 3. Chill — scenic stops, water bodies, cafes
    if (['lake', 'dam', 'coastal', 'viewpoint'].includes(cat) ||
        descHas('sunset', 'sunrise', 'scenic', 'cafe', 'chill')) {
        return 'Chill';
    }

    // 4. Highway — long straight cruises
    if (cat === 'route' || descHas('highway', 'straight', 'cruise')) {
        return 'Highway';
    }

    // 5. Default fallback
    return 'Twisties';
}

// --- THE FIREBASE BACKFILL LOOP ---
async function populateVibeTypes() {
    console.log(`\n🌈 POPULATING VIBE TYPES...\n`);

    const snapshot = await db.collection('trails').get();
    console.log(`📂 Loaded ${snapshot.size} trail documents from Firestore.\n`);

    let updated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
        const trail = doc.data();
        const name = trail.locationName || doc.id;

        // Only fill in trails that don't already have a vibeType.
        if (trail.vibeType !== undefined && trail.vibeType !== null && trail.vibeType !== '') {
            console.log(`    ⏭️  Skipped "${name}": already has vibeType "${trail.vibeType}".`);
            skipped++;
            continue;
        }

        const vibeType = classifyVibe(trail.category, trail.description);
        await doc.ref.update({ vibeType });

        console.log(`    ✔️  "${name}" → ${vibeType}  (category: ${trail.category || 'n/a'})`);
        updated++;
    }

    console.log(`\n🏁 DONE. Updated: ${updated} | Skipped: ${skipped}`);
}

// 🎯 RUN IT
populateVibeTypes()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
