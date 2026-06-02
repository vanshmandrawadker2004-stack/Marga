import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ytSearch from 'yt-search'; 
import fetch from 'node-fetch'; 
import dotenv from 'dotenv'; 
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// 🛑 INITIALIZE ENVIRONMENT VARIABLES & FIREBASE 🛑
dotenv.config();

// Make sure you have downloaded this file from your Firebase Project Settings
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- THE MATHEMATICAL ENGINE: Haversine Distance Formula ---
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- UPGRADED MAPBOX VERIFICATION ENGINE (With Anchor Leash) ---
async function verifyCoordinates(gem) {
    try {
        const puneLat = 18.5204;
        const puneLng = 73.8567;
        
        // --- STEP 1: Find the True Anchor ---
        let anchorCoords = null;
        if (gem.anchorCity) {
            const anchorQuery = encodeURIComponent(`${gem.anchorCity}, India`);
            const anchorUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${anchorQuery}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
            const anchorRes = await fetch(anchorUrl);
            const anchorData = await anchorRes.json();
            
            if (anchorData.features && anchorData.features.length > 0) {
                anchorCoords = {
                    lng: anchorData.features[0].center[0],
                    lat: anchorData.features[0].center[1]
                };
            }
        }

        // --- STEP 2: Find the Specific Spot (Patched for Stutter & Borders) ---
        let cleanName = gem.locationName;
        if (gem.category !== 'Cafe/Restaurant' && !cleanName.toLowerCase().includes(gem.category.toLowerCase())) {
            cleanName = `${cleanName} ${gem.category}`;
        }
        
        const searchQuery = `${cleanName}, ${gem.anchorCity ? gem.anchorCity + ',' : ''} India`;
        const query = encodeURIComponent(searchQuery);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_TOKEN}&limit=1&types=poi,place,locality,outdoors`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            const resultLng = data.features[0].center[0];
            const resultLat = data.features[0].center[1];
            
            // --- STEP 3: THE WATERFALL FILTERS ---
            
            // Filter 1: The City-Center Kill Switch (15km limit)
            const distanceToCityCenter = calculateDistanceKm(puneLat, puneLng, resultLat, resultLng);
            const natureCategories = ['Ghat', 'Trail', 'Viewpoint', 'Off-Road', 'Lake'];
            
            if (natureCategories.includes(gem.category) && distanceToCityCenter < 15) {
                console.log(`    🛑 BLOCKED: "${gem.locationName}" mapped inside Pune city limits. False positive.`);
                return null;
            }

            // Filter 2: The Anchor Leash (120km limit)
            if (anchorCoords) {
                const distToAnchor = calculateDistanceKm(anchorCoords.lat, anchorCoords.lng, resultLat, resultLng);
                
                if (distToAnchor > 120) {
                    console.log(`    🛑 BLOCKED: "${gem.locationName}" is ${distToAnchor.toFixed(1)}km away from its anchor region (${gem.anchorCity}). Mapbox hallucination.`);
                    return null;
                }
            }

            return { lng: resultLng, lat: resultLat };
        }
        return null;
    } catch (error) {
        console.error(`    ⚠️ Mapbox API error for ${gem.locationName}`);
        return null;
    }
}

// --- THE SINGLE VIDEO ENGINE ---
async function huntForGems(videoUrl) {
    try {
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoUrl);
        const rawText = transcriptArray.map(t => t.text).join(' ');
        
        if (rawText.length === 0) throw new Error("Transcript empty.");
        console.log(`  ✅ Downloaded transcript. Handing to Gemini...`);

        const prompt = `
        You are an expert geographical data extraction engine for "Marga". 
        Extract every notable riding location, viewpoint, or road mentioned in this vlog transcript.

        CRITICAL RULES:
        1. Naming & Hygiene: Use the REAL, specific map name or proper noun (e.g., 'Tikona Fort', 'Pawna Lake'). NEVER include descriptive paths or conversational filler like 'Route to...', 'Path leading to...', 'Off-road section to...'. 
        2. "anchorCity" MUST be the nearest localized town or sub-region hub (e.g., "Lonavala", "Kamshet", "Mulshi"). If it is a generic ride around Pune's outskirts, use "Pune".
        3. "category" MUST be exactly one of: "Ghat", "Trail", "Viewpoint", "Off-Road", "Cafe/Restaurant", or "Lake".
        4. Keep "description" under 40 words, packed with sensory terrain keywords.
        5. "distanceKm" and "rideTimeMinutes" MUST be null.
        6. "breakfastStop" and "cafe" MUST be a real mentioned name, or null.

        OUTPUT FORMAT (JSON Array ONLY):
        [
          {
            "locationName": "Specific Name Here",
            "anchorCity": "Lonavala",
            "category": "Ghat",
            "subCategory": "Twisty Tarmac",
            "vibeType": "Adventure",
            "description": "A dense, misty forest route famous for tight cornering and smooth tarmac.",
            "distanceKm": null,
            "rideTimeMinutes": null,
            "breakfastStop": null,
            "cafe": null,
            "petrolPump": true,
            "emergency": false,
            "images": []
          }
        ]

        Transcript: 
        ${rawText}
        `;

        // --- GEMINI EXTRACTION WITH 503 & 429 RETRY LOGIC ---
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        let result = null;
        let retries = 3;

        while (retries > 0) {
            try {
                result = await model.generateContent(prompt);
                break; 
            } catch (err) {
                // Check if it is a 503 (Overloaded) OR a 429 (Rate Limited)
                if (err.message && (err.message.includes('503') || err.message.includes('429'))) {
                    const errorType = err.message.includes('429') ? '429 Rate Limit' : '503 Overloaded';
                    console.log(`    ⚠️ Gemini API hit a speed bump (${errorType}). Cooling down for 45 seconds... (${retries - 1} attempts left)`);
                    await sleep(45000); 
                    retries--;
                } else {
                    throw err; 
                }
            }
        }

        if (!result) throw new Error("Gemini API failed after 3 retries. Wait a few hours for your quota to reset.");
        
        // 🐛 BUG FIX: We re-added the parsing step that was missing!
        let cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanText);
        
        console.log(`  💎 Gemini found ${extractedData.length} potential locations. Verifying with Mapbox...`);

        // --- THE AUTOMATED FILTER ---
        const verifiedGems = [];
        
        for (let gem of extractedData) {
            const coords = await verifyCoordinates(gem); 
            
            if (coords) {
                gem.latitude = coords.lat;
                gem.longitude = coords.lng;
                verifiedGems.push(gem);
                console.log(`    ✔️ Verified: ${gem.locationName}`);
            } else {
                console.log(`    ❌ Rejected: ${gem.locationName}`);
            }
            
            await sleep(500); 
        }

        return verifiedGems;

    } catch (error) {
        console.log(`  ❌ Skipped Video (${videoUrl}):`, error.message);
        return []; 
    }
}

// --- THE FIREBASE BATCH AUTOMATION LOOP ---
async function runBatchScraper(urls) {
    console.log(`\n🚀 INITIALIZING EXTRACTION FOR ${urls.length} VIDEOS...\n`);
    
    // 1. Fetch existing names from Firebase to prevent duplicates efficiently
    let existingNames = [];
    try {
        console.log(`📂 Downloading existing trail registry from Firestore...`);
        const snapshot = await db.collection('trails').get();
        existingNames = snapshot.docs.map(doc => doc.data().locationName.toLowerCase());
        console.log(`✅ Loaded ${existingNames.length} existing entries.`);
    } catch (error) {
        console.log(`⚠️ Could not reach Firestore database. Starting fresh.`, error.message);
    }

    for (let i = 0; i < urls.length; i++) {
        console.log(`\n--- Processing Video ${i + 1} of ${urls.length} ---`);
        console.log(`▶️ URL: ${urls[i]}`);
        
        const newGems = await huntForGems(urls[i]);
        
        if (newGems.length > 0) {
            let addedCount = 0;
            
            // 2. THE DEDUPER: Check against our downloaded Firebase list
            for (const gem of newGems) {
                const isDuplicate = existingNames.includes(gem.locationName.toLowerCase());

                if (!isDuplicate) {
                    // It's a new location! Add to cloud.
                    const cleanGem = {
                        ...gem,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    };
                    
                    const docId = gem.locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    
                    await db.collection('trails').doc(docId).set(cleanGem);
                    existingNames.push(gem.locationName.toLowerCase()); // Update local cache
                    
                    console.log(`    ☁️ Saved to Firestore: "${gem.locationName}"`);
                    addedCount++;
                } else {
                    console.log(`    ♻️ Skipped Cloud Duplicate: "${gem.locationName}" is already in Firestore.`);
                }
            }

            console.log(`✨ Processed video. Added ${addedCount} new entries to the cloud.`);
        }

        if (i < urls.length - 1) {
            console.log(`⏳ Cooling down for 15 seconds to respect Free-Tier limits...`);
            await sleep(15000); 
        }
    }
    console.log(`\n🏁 BATCH COMPLETE!`);
}

// --- THE NEW AUTOPILOT DISCOVERY ENGINE ---
async function autoDiscoverAndScrape(searchQuery, maxVideos) {
    console.log(`\n🕵️‍♂️ AUTOPILOT ENGAGED: Searching YouTube for "${searchQuery}"...`);

    try {
        const searchResults = await ytSearch(searchQuery);
        const videos = searchResults.videos.slice(0, maxVideos);

        if (videos.length === 0) {
            console.log("❌ No videos found for that query.");
            return;
        }

        console.log(`✅ Found ${videos.length} videos! Assembling playlist...\n`);

        const autoPlaylist = videos.map(v => v.url);
        videos.forEach((v, i) => console.log(`   ${i + 1}. ${v.title}`));

        await runBatchScraper(autoPlaylist);

    } catch (error) {
        console.error("❌ Autopilot search failed:", error);
    }
}

// 🎯 START THE ENGINE ON AUTOPILOT!
autoDiscoverAndScrape("Pune motorcycle hidden trails weekend ride", 30);