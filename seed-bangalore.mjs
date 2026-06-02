import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase just like in hunter.mjs
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const bangaloreTrails = [
    {
        locationName: "Nandi Hills",
        anchorCity: "Chikkaballapur",
        category: "Ghat",
        description: "Classic Bangalore weekend sunrise ride. Smooth twisties but expect heavy weekend traffic.",
        latitude: 13.3702,
        longitude: 77.6835,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Devarayanadurga (DD Hills)",
        anchorCity: "Tumkur",
        category: "Ghat",
        description: "Quiet, narrow forest twisties leading to a rocky hilltop temple. Much less crowded than Nandi.",
        latitude: 13.3752,
        longitude: 77.2104,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Avalabetta",
        anchorCity: "Chikkaballapur",
        category: "Viewpoint",
        description: "Known as 'Nandi Hills without the crowd.' Great rocky viewpoints and decent approach roads.",
        latitude: 13.5786,
        longitude: 77.6744,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Savandurga Base",
        anchorCity: "Magadi",
        category: "Trail",
        description: "Ride through dense state forests to the base of Asia's largest monolith. Some great dirt patches.",
        latitude: 12.9197,
        longitude: 77.2938,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Anchetty Loop",
        anchorCity: "Hosur",
        category: "Off-Road",
        description: "The ultimate ADV route crossing into Tamil Nadu. Tight hairpins, forest reserves, and broken tarmac.",
        latitude: 12.5694,
        longitude: 77.7289,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Muthyalamaduvu (Pearl Valley)",
        anchorCity: "Anekal",
        category: "Lake",
        description: "A short breakfast ride leading to a small waterfall and forest trail south of the city.",
        latitude: 12.7758,
        longitude: 77.7005,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Makalidurga Route",
        anchorCity: "Doddaballapura",
        category: "Trail",
        description: "Scenic ride alongside railway tracks and a lake, leading to a fort trek base.",
        latitude: 13.4357,
        longitude: 77.5015,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Manchanabele Dam View",
        anchorCity: "Ramanagara",
        category: "Lake",
        description: "Stunning reservoir view surrounded by Savandurga hills. Great sunset spot with some off-road access.",
        latitude: 12.8732,
        longitude: 77.3340,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Muninagara Forest Edge",
        anchorCity: "Kanakapura",
        category: "Off-Road",
        description: "Hidden dirt trails cutting through the outskirts of the Bannerghatta forest boundary.",
        latitude: 12.7561,
        longitude: 77.5342,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Skandagiri Base",
        anchorCity: "Kalavara",
        category: "Viewpoint",
        description: "Quiet village roads leading to the base of the famous night-trekking peak. Great early morning fog.",
        latitude: 13.4182,
        longitude: 77.6833,
        petrolPump: false,
        images: []
    }
];

async function seedDatabase() {
    console.log("🚀 Injecting 10 Bangalore trails into Firestore...");
    let added = 0;

    for (const gem of bangaloreTrails) {
        try {
            // Create a safe URL-friendly document ID based on the name
            const docId = gem.locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            const cleanGem = {
                ...gem,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('trails').doc(docId).set(cleanGem);
            console.log(`  ✔️ Added: ${gem.locationName}`);
            added++;
        } catch (error) {
            console.error(`  ❌ Failed to add ${gem.locationName}:`, error.message);
        }
    }
    
    console.log(`\n✅ Done! Successfully injected ${added} locations.`);
    process.exit();
}

seedDatabase();