import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ytSearch from 'yt-search'; 
import fs from 'fs';

// 🛑 PUT YOUR API KEY HERE 🛑
const ai = new GoogleGenerativeAI("AIzaSyBbC1To9oUJ-sEAO81c_Th53C5EAf3qwGk");

// --- HELPER: Anti-Ban Delay Function ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- THE SINGLE VIDEO ENGINE ---
async function huntForGems(videoUrl) {
    try {
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoUrl);
        const rawText = transcriptArray.map(t => t.text).join(' ');
        
        if (rawText.length === 0) throw new Error("Transcript empty.");
        console.log(`   ✅ Downloaded transcript. Handing to Gemini...`);

        const prompt = `
        You are an expert geographical data extraction engine for "TorqueTrails," a premium motorcycle routing application. 

        I will provide you with the raw transcript of a motorcycle vlog. Your job is to extract every notable location, viewpoint, road, or pitstop mentioned and return a strictly formatted JSON array.

        CRITICAL RULES:
        1. Naming & Hygiene: Use the REAL, specific map name. Remove conversational filler.
        2. Deduplication: Merge overlapping areas into a single entry. Every locationName MUST be unique.
        3. Category: MUST be one of ["Terrain", "Pitstop", "Viewpoint", "Food"]. Subcategory must fit UI filters (e.g., Lake, Dam, Ghat Road, Cafe).
        4. Telemetry:
           - "rideTimeMinutes": Realistic one-way riding time in minutes from trip start (Number only).
           - "distanceKm": Estimate distance in km (Number only).
           - "sunriseTime": Always exactly "Live API Fetched".
           - "recommendedLeaveTime": Always exactly "Live API Fetched".
        5. CRITICAL RULE FOR breakfastStop: You MUST return a concise, 2-3 word proper noun (e.g., 'Shree Datta Snacks', 'Mapro Garden Cafe', 'Highway Dhaba'). NEVER return full sentences, descriptive text, or 'N/A'. If a specific restaurant name is not mentioned in the video, intelligently invent a plausible, short, realistic name based on the location.
        6. Images: Always include an empty array called "images": []. This reserves the architectural space for manual image curation later.

        OUTPUT FORMAT: Return ONLY a valid JSON array of objects. No markdown, no explanations. Use this schema:
        [
          {
            "locationName": "Specific Name Here",
            "category": "Viewpoint",
            "subCategory": "Lake, Dam",
            "vibeType": "Short 2-3 word vibe",
            "rideTimeMinutes": 120,
            "distanceKm": 60,
            "sunriseTime": "Live API Fetched",
            "recommendedLeaveTime": "Live API Fetched",
            "breakfastStop": "Shree Datta Snacks",
            "description": "A 1-2 sentence description.",
            "latitude": 18.0673,
            "longitude": 73.7744,
            "images": []
          }
        ]

        Transcript: 
        ${rawText}
        `;

        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        
        let cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(cleanText);
        
        console.log(`   💎 Found ${extractedData.length} gems in this video.`);
        return extractedData;

    } catch (error) {
        console.log(`   ❌ Skipped Video (${videoUrl}):`, error.message);
        return []; 
    }
}

// --- THE BATCH AUTOMATION LOOP ---
async function runBatchScraper(urls) {
    console.log(`\n🚀 INITIALIZING EXTRACTION FOR ${urls.length} VIDEOS...\n`);
    
    const dbPath = 'database.json';
    let masterDatabase = [];

    if (fs.existsSync(dbPath)) {
        const rawData = fs.readFileSync(dbPath);
        masterDatabase = JSON.parse(rawData);
        console.log(`📂 Loaded existing database with ${masterDatabase.length} entries.`);
    }

    for (let i = 0; i < urls.length; i++) {
        console.log(`\n--- Processing Video ${i + 1} of ${urls.length} ---`);
        console.log(`▶️ URL: ${urls[i]}`);
        
        const newGems = await huntForGems(urls[i]);
        
        if (newGems.length > 0) {
            masterDatabase.push(...newGems);
            fs.writeFileSync(dbPath, JSON.stringify(masterDatabase, null, 2));
            console.log(`💾 Autosaved. Database total: ${masterDatabase.length} entries.`);
        }

        if (i < urls.length - 1) {
            console.log(`⏳ Cooling down for 8 seconds to prevent API bans...`);
            await sleep(8000); 
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
// Format: autoDiscoverAndScrape("Search Query", NumberOfVideos)
autoDiscoverAndScrape("Pune hidden motorcycle rides", 10);