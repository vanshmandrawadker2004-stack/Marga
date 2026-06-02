// 1. IMPORT FIREBASE 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyDrNHXexafbTftQZ1Tx4H4I4CjXEiKjR_8",
    authDomain: "marga-fb0e2.firebaseapp.com",
    projectId: "marga-fb0e2",
    storageBucket: "marga-fb0e2.firebasestorage.app",
    messagingSenderId: "248899773133",
    appId: "1:248899773133:web:04fe1a26264d2bde3dbf84",
    measurementId: "G-C2NVQJBW2B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 3. MAP INITIALIZATION
const map = L.map('map', { zoomControl: false }).setView([18.5204, 73.8567], 8);
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidmFuc2htMjAwNCIsImEiOiJjbXB1c2lmOHExZ3Y4MnFzZWhoZXoyN2xlIn0.zA6kBde68WK6YdB1tJQ0Fw', {
    tileSize: 512, zoomOffset: -1, maxZoom: 19, attribution: '© Mapbox © OpenStreetMap'
}).addTo(map);

let currentMarkers = [];
let heatLayer = null;
let routingControl = null;
let currentRouteCoords = []; 
let userLat = 18.5204; 
let userLng = 73.8567; 
let userMarker = null; 
let currentRiderProfile = null; 
let favoritedLocations = new Set(); 

// --- LOGIN & AUTH LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-submit-btn');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const googleBtn = document.getElementById('google-login-btn');
    const guestBtn = document.getElementById('guest-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginCard = document.getElementById('login-card');
    const qWrap = document.getElementById('questionnaire-wrap');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    document.querySelectorAll('.mcq-option').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('multi')) this.classList.toggle('selected');
            else {
                this.parentElement.querySelectorAll('.mcq-option').forEach(sib => sib.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
    });

    async function routeUser(user) {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.bikeModel === "Unknown" || !data.bikeModel) {
                loginCard.style.display = 'none'; qWrap.style.display = 'flex';
            } else {
                currentRiderProfile = data;
                
                // Cloud Favorites Sync
                favoritedLocations.clear();
                if (data.savedTrails && data.savedTrails.length > 0) {
                    data.savedTrails.forEach(trail => favoritedLocations.add(trail));
                }
                updateSavedTrailsSidebar(); 
                
                // Update Top Toolbar Profile Text
                document.getElementById('profile-name').innerText = user.displayName || user.email.split('@')[0];
                document.getElementById('profile-avatar').innerText = (user.displayName || user.email)[0].toUpperCase();
                document.getElementById('profile-tag').innerText = `${data.bikeModel} | ${data.skillLevel}`;
                
                loginCard.style.display = 'none'; qWrap.style.display = 'none';
                document.body.classList.add('logged-in'); 
                executeSearch();
            }
        }
    }

    onAuthStateChanged(auth, (user) => {
        if (user) routeUser(user);
        else {
            loginCard.style.display = 'block'; qWrap.style.display = 'none';
            document.body.classList.remove('logged-in');
            document.body.classList.remove('menu-open'); 
            
            const locCard = document.getElementById('location-card');
            if (locCard) locCard.style.display = 'none';
            
            const searchBar = document.getElementById('search-bar');
            if (searchBar) searchBar.value = '';

            currentRiderProfile = null;
            favoritedLocations.clear(); 
            updateSavedTrailsSidebar();
            
            currentMarkers.forEach(m => map.removeLayer(m));
            currentMarkers = [];
            if (routingControl) { map.removeLayer(routingControl); routingControl = null; }
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

    if (saveProfileBtn) saveProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        const selectedBike = document.querySelector('#bike-group .mcq-option.selected')?.getAttribute('data-value');
        const selectedSkill = document.querySelector('#skill-group .mcq-option.selected')?.getAttribute('data-value');
        const selectedVibes = Array.from(document.querySelectorAll('#vibe-group .mcq-option.selected')).map(el => el.getAttribute('data-value'));
        
        await updateDoc(doc(db, "users", user.uid), { bikeModel: selectedBike, skillLevel: selectedSkill, idealVibes: selectedVibes });
        routeUser(user);
    });

    if (googleBtn) googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userSnap = await getDoc(doc(db, "users", result.user.uid));
            if (!userSnap.exists()) await setDoc(doc(db, "users", result.user.uid), { email: result.user.email, bikeModel: "Unknown", savedTrails: [] });
        } catch (e) { console.error(e); }
    });

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = emailInput ? emailInput.value.trim() : '';
            const pass = passInput ? passInput.value.trim() : '';
            if (!email.includes('@') || pass.length < 6) return alert("Invalid email/password.");
            try { await signInWithEmailAndPassword(auth, email, pass); } 
            catch (error) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                    try {
                        const res = await createUserWithEmailAndPassword(auth, email, pass);
                        await setDoc(doc(db, "users", res.user.uid), { email: res.user.email, authProvider: "email", bikeModel: "Unknown", savedTrails: [], createdAt: new Date() });
                        routeUser(res.user); 
                    } catch (err) { alert("Error: " + err.message); }
                }
            }
        });
    }

    if (guestBtn) {
        guestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginCard.style.display = 'none'; qWrap.style.display = 'none';
            
            document.getElementById('profile-name').innerText = "Guest Rider";
            document.getElementById('profile-avatar').innerText = "G";
            document.getElementById('profile-tag').innerText = "Preview Mode";
            
            document.body.classList.add('logged-in');
            executeSearch(); 
        });
    }
});

// --- GPS ---
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            const gpsIcon = L.divIcon({ className: 'user-location-marker', iconSize: [12, 12], iconAnchor: [6, 6] });
            userMarker = L.marker([userLat, userLng], { icon: gpsIcon, zIndexOffset: 1000 }).addTo(map);
        },
        (error) => { console.warn("Geolocation denied."); },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

// --- BUTTONS & UX ---
const searchBtn = document.getElementById('search-btn');
if (searchBtn) searchBtn.addEventListener('click', () => { executeSearch(); });

// --- NLP ENGINE ---
function parseConversationalQuery(rawQuery) {
    let extractedMaxMins = null;
    let extractedMaxKm = null;
    let searchKeywords = [];
    const lowerQuery = rawQuery.toLowerCase();
    const hrMatch = lowerQuery.match(/([0-9.]+)\s*(hours|hour|hrs|hr|h)\b/);
    if (hrMatch) extractedMaxMins = parseFloat(hrMatch[1]) * 60;
    const minMatch = lowerQuery.match(/([0-9]+)\s*(minutes|minute|mins|min|m)\b/);
    if (minMatch && !hrMatch) extractedMaxMins = parseInt(minMatch[1]);
    const kmMatch = lowerQuery.match(/([0-9]+)\s*(kms|km|kilometers|kilometer)\b/);
    if (kmMatch) extractedMaxKm = parseInt(kmMatch[1]);

    let cleanText = lowerQuery;
    if (hrMatch) cleanText = cleanText.replace(hrMatch[0], '');
    if (minMatch) cleanText = cleanText.replace(minMatch[0], '');
    if (kmMatch) cleanText = cleanText.replace(kmMatch[0], '');

    const fillerWords = ['i','want','to','go','for','a','ride','show','me','some','places','near','around','the','is','are','in','on','at','with','under','less','than','away','from','here','find','search','within','max','that','take','takes','it','will','which','have','has','can','you','my','give','we','do','any','would','love','looking','out','there','hours','hour','hrs','hr','h','minutes','minute','mins','min','m','kms','km','kilometers','kilometer','of'];
    
    cleanText.split(/\s+/).forEach(word => {
        const cleanWord = word.replace(/[^a-z0-9]/g, ''); 
        if (cleanWord && !fillerWords.includes(cleanWord) && isNaN(cleanWord)) searchKeywords.push(cleanWord);
    });

    return { extractedMaxMins, extractedMaxKm, searchKeywords };
}

function executeSearch() {
    const searchInput = document.getElementById('search-bar');
    const query = searchInput ? searchInput.value.trim() : '';
    
    document.body.classList.add('map-active');
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
    
    if (routingControl) { 
        map.removeLayer(routingControl);
        routingControl = null; 
        currentRouteCoords = []; 
        document.querySelectorAll('.utility-toggle').forEach(cb => {
            if (cb.checked) { cb.checked = false; utilityLayers[cb.id].clearLayers(); }
        });
    }
    
    const locationCard = document.getElementById('location-card');
    if (locationCard) locationCard.style.display = 'none';

    const smartQuery = parseConversationalQuery(query);
    const toggleDist = document.getElementById('toggle-distance');
    const toggleDur = document.getElementById('toggle-duration');
    const isDistActive = toggleDist && toggleDist.checked;
    const isDurActive = toggleDur && toggleDur.checked;

    const activeUtilities = [];
    document.querySelectorAll('.utility-toggle').forEach(cb => {
        if (cb.checked) activeUtilities.push(cb.getAttribute('data-query').toLowerCase());
    });
    
    // --- THIS IS THE PART THAT WAS MISSING YOUR CLOSING LOGIC ---
    getDocs(collection(db, "trails")).then(snapshot => {
        const data = snapshot.docs.map(doc => doc.data());

        let matchedGems = data.filter(gem => {
            let isMatch = true;
            if (!gem.latitude || !gem.longitude) return false;
            const distKm = map.distance([userLat, userLng], [gem.latitude, gem.longitude]) / 1000;
            let currentMaxKm = 200; 
            if (smartQuery.extractedMaxKm) currentMaxKm = smartQuery.extractedMaxKm;
            else if (isDistActive) currentMaxKm = parseInt(document.getElementById('range-distance').value);
            if (distKm > currentMaxKm) isMatch = false;

            if (isMatch) {
                const estTime = gem.rideTimeMinutes || (distKm * 1.5);
                if (smartQuery.extractedMaxMins) { if (estTime > smartQuery.extractedMaxMins) isMatch = false; } 
                else if (isDurActive) { const maxDurHrs = parseFloat(document.getElementById('range-duration').value); if (estTime > (maxDurHrs * 60)) isMatch = false; }
            }

            if (isMatch && activeUtilities.length > 0) {
                let gemText = `${gem.locationName || ''} ${gem.description || ''} ${gem.vibeType || ''} ${gem.category || ''} ${gem.breakfastStop || ''} ${gem.cafe || ''}`.toLowerCase();
                if (gem.breakfastStop || gem.cafe) gemText += " restaurant food cafe ";
                if (gem.petrolPump) gemText += " petrol pump ";
                if (gem.emergency) gemText += " hospital clinic police emergency ";
                activeUtilities.forEach(utilQuery => {
                    const utilKeywords = utilQuery.split(' '); 
                    const hasKeyword = utilKeywords.some(keyword => gemText.includes(keyword));
                    if (!hasKeyword) isMatch = false;
                });
            }
            return isMatch;
        });

        matchedGems = matchedGems.map(gem => {
            let personalScore = 0;
            
            // ⚠️ Changed to 'let' so we can inject words into it!
            let gemText = `${gem.vibeType || ''} ${gem.category || ''} ${gem.description || ''} ${gem.subCategory || ''}`.toLowerCase();
            
            // --- SMART SYNONYM INJECTION (Only put it here, ONCE!) ---
            if (gem.category === 'Mountain' || gem.category === 'Scenic') gemText += " sunrise sunset view nature photography morning evening twilight ";
            if (gem.category === 'Coastal') gemText += " sunset sunrise beach ocean sea water evening coast ";
            if (gem.vibeType === 'Twisties') gemText += " corners leaning fast curves canyon aggressive ghat ";
            if (gem.vibeType === 'OffRoad') gemText += " adventure hardcore trail dirt mud rocks watercrossing off grid ";
            if (gem.vibeType === 'Chill') gemText += " relax calm easy scenic slow sunset cafe evening ";

            if (currentRiderProfile) {
                if (currentRiderProfile.idealVibes) {
                    currentRiderProfile.idealVibes.forEach(vibe => {
                        if (vibe === "Twisties" && (gemText.includes("curve") || gemText.includes("tarmac") || gemText.includes("twist") || gemText.includes("corner") || gemText.includes("ghat"))) personalScore += 5;
                        if (vibe === "OffRoad" && (gemText.includes("dirt") || gemText.includes("trail") || gemText.includes("off-road") || gemText.includes("mud") || gemText.includes("rocky"))) personalScore += 5;
                        if (vibe === "Chill" && (gemText.includes("cafe") || gemText.includes("sunset") || gemText.includes("lake") || gemText.includes("scenic") || gemText.includes("relax"))) personalScore += 5;
                        if (vibe === "Highway" && (gemText.includes("straight") || gemText.includes("highway") || gemText.includes("fast") || gemText.includes("cruise"))) personalScore += 5;
                    });
                }
                const isHardcoreOffroad = gemText.includes("hardcore") || gemText.includes("river") || gemText.includes("steep dirt") || gemText.includes("off-road") || gemText.includes("boulders");
                if (isHardcoreOffroad) {
                    if (["Sport", "Cruiser", "Commuter"].includes(currentRiderProfile.bikeModel)) personalScore -= 10;
                    if (currentRiderProfile.skillLevel === "Beginner") personalScore -= 10;
                }
            }

            if (smartQuery.searchKeywords.length > 0) {
                smartQuery.searchKeywords.forEach(kw => {
                    if (gem.locationName?.toLowerCase().includes(kw)) personalScore += 10;
                    else if (gemText.includes(kw)) personalScore += 2;
                });
                if (personalScore <= 0) return null; 
            }
            return { ...gem, personalScore };
        }).filter(gem => gem !== null);
        matchedGems.sort((a, b) => b.personalScore - a.personalScore);

        if (matchedGems.length > 0) {
            let bounds = [[userLat, userLng]];
            const isRadarMode = document.getElementById('toggle-radar')?.checked;

            if (isRadarMode) {
                currentMarkers.forEach(marker => map.removeLayer(marker));
                currentMarkers = [];
                if (heatLayer) map.removeLayer(heatLayer);
                
                const heatData = matchedGems.map(gem => {
                    bounds.push([gem.latitude, gem.longitude]);
                    let intensity = (gem.personalScore && gem.personalScore >= 5) ? 1.0 : 0.6;
                    return [parseFloat(gem.latitude), parseFloat(gem.longitude), intensity];
                });

                heatLayer = L.heatLayer(heatData, {
                    radius: 40, blur: 30,
                    gradient: { 0.4: '#002233', 0.6: '#0088aa', 0.8: '#00f0ff', 1.0: '#ffffff' }
                }).addTo(map);
            } else {
                if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
                matchedGems.forEach((gem) => {
                    let pinColor = '#00f0ff'; let pinRadius = 5; let pinOpacity = 0.8; let pinWeight = 0; 
                    if (currentRiderProfile) {
                        if (gem.personalScore >= 5) { pinColor = '#FFD700'; pinRadius = 7; pinOpacity = 1; } 
                        else if (gem.personalScore < 0) { pinColor = '#555555'; pinRadius = 4; pinOpacity = 0.4; }
                    }
                    const marker = L.circleMarker([gem.latitude, gem.longitude], { 
                        radius: pinRadius, fillColor: pinColor, color: pinColor, weight: pinWeight, opacity: pinOpacity, fillOpacity: pinOpacity 
                    }).addTo(map);
                    currentMarkers.push(marker);
                    bounds.push([gem.latitude, gem.longitude]);
                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        calculateRoute(gem.latitude, gem.longitude);
                        showLocationCard(gem);
                    });
                });
            }
            if (query !== '' || isDistActive || isDurActive || activeUtilities.length > 0) {
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
            }
        } else {
            if (query !== '') {
                const searchBar = document.getElementById('search-bar');
                if (searchBar) {
                    const originalText = searchBar.value;
                    searchBar.style.color = "#555";
                    searchBar.value = "No results found.";
                    setTimeout(() => { searchBar.value = originalText; searchBar.style.color = "#fff"; }, 1500);
                }
            }
        }
    }).catch(err => console.error("Database Error:", err));
}

// --- ROUTING ---
function calculateRoute(destLat, destLng) {
    if (routingControl) { map.removeLayer(routingControl); routingControl = null; }
    const token = 'pk.eyJ1IjoidmFuc2htMjAwNCIsImEiOiJjbXB1c2lmOHExZ3Y4MnFzZWhoZXoyN2xlIn0.zA6kBde68WK6YdB1tJQ0Fw'; 
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${token}`;

    fetch(url).then(r => r.json()).then(data => {
        if (!data.routes || data.routes.length === 0) return;
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        routingControl = L.polyline(coordinates, { color: '#00f0ff', weight: 5, opacity: 0.85 }).addTo(map);
        currentRouteCoords = coordinates.map(c => ({ lat: c[0], lng: c[1] }));

        const realDistanceKm = (route.distance / 1000).toFixed(1);
        const rawMinutes = route.duration / 60;
        
        // Removed the artificial time padding. 
        // We now use the raw routing engine data for better Google Maps parity.
        let realisticMinutes = Math.round(rawMinutes);

        const hrs = Math.floor(realisticMinutes / 60);
        const mins = Math.floor(realisticMinutes % 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

        const distUI = document.getElementById('live-distance');
        const durUI = document.getElementById('live-duration');
        
        if (distUI) distUI.innerText = `${realDistanceKm} km`;
        if (durUI) durUI.innerText = timeStr;

        // --- SYNC SOLAR WIDGET WITH REAL ROUTED TIME ---
        if (typeof SunCalc !== 'undefined') {
            const times = SunCalc.getTimes(new Date(), destLat, destLng);
            const formatTime = (date) => date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // realisticMinutes comes directly from the Mapbox API above!
            const leaveSunrise = new Date(times.sunrise.getTime() - (realisticMinutes * 60000));
            const leaveSunset = new Date(times.sunset.getTime() - (realisticMinutes * 60000));

            const sunriseEl = document.getElementById('leave-sunrise-val');
            const sunsetEl = document.getElementById('leave-sunset-val');
            
            if (sunriseEl) sunriseEl.innerText = `Leave by ${formatTime(leaveSunrise)}`;
            if (sunsetEl) sunsetEl.innerText = `Leave by ${formatTime(leaveSunset)}`;
        }
        
    }).catch(err => console.error("Routing Error:", err));
}

// --- PREMIUM TELEMETRY GENERATOR ---
function generateTelemetrySVG(lat) {
    // Generate a consistent topography profile based on the location's coordinates
    let seed = lat * 10000;
    const random = () => { let x = Math.sin(seed++) * 10000; return x - Math.floor(x); };
    
    const pts = [];
    let currentElev = 400;
    for(let i=0; i<15; i++) {
        currentElev += (random() * 100 - 40);
        pts.push(currentElev);
    }
    
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const step = 300 / (pts.length - 1);
    
    const points = pts.map((p, i) => {
        const x = i * step;
        const y = 40 - ((p - min) / (max - min || 1) * 40);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `
        <div style="margin-bottom: 28px;">
            <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; font-weight: 800;">Elevation</div>
            <svg width="100%" height="40" viewBox="0 0 300 40" preserveAspectRatio="none" style="overflow: visible;">
                <defs>
                    <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="#00f0ff" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <polygon points="0,40 ${points} 300,40" fill="url(#elevGradient)"/>
                <polyline points="${points}" fill="none" stroke="#00f0ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 6px rgba(0,240,255,0.6));"/>
            </svg>
        </div>
    `;
}

// --- LOCATION CARD UI (CRED-LEVEL TYPOGRAPHY) ---
function showLocationCard(gem) {
    const card = document.getElementById('location-card');
    if (!card) return;
    
    // Curated Photo Feed (100% Free)
    let carouselHTML = '';
    if (gem.images && gem.images.length > 0) {
        const imageTags = gem.images.map(imgUrl => `<img src="${imgUrl}" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05);">`).join('');
        carouselHTML = `<div class="photo-carousel" style="display: flex; gap: 12px; overflow-x: auto; margin-bottom: 24px; padding-bottom: 4px;">${imageTags}</div>`;
    } else {
        carouselHTML = `
        <div class="photo-carousel" style="display: flex; gap: 12px; overflow-x: auto; margin-bottom: 24px; padding-bottom: 4px;">
            <div style="color: #444; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 16px 0; width: 100%; text-align: center;">Visual Data Pending</div>
        </div>`;
    }

    let tempTime = 'Calc...';
    if (gem.rideTimeMinutes) {
        const h = Math.floor(gem.rideTimeMinutes / 60);
        const m = gem.rideTimeMinutes % 60;
        tempTime = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    // EXTREME CONTRAST LABELS & VALUES
    let distDurHTML = `
        <div style="display: flex; margin-bottom: 28px; align-items: center;">
            <div style="flex: 1; padding-right: 16px;">
                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; font-weight: 800;">Distance</div>
                <div id="live-distance" style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Calc...</div>
            </div>
            <div style="width: 1px; height: 32px; background: rgba(255, 255, 255, 0.08);"></div>
            <div style="flex: 1; padding-left: 20px;">
                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; font-weight: 800;">Duration</div>
                <div id="live-duration" style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${tempTime}</div>
            </div>
        </div>
    `;

    // --- LIVE SOLAR & DEPARTURE TELEMETRY ---
    let solarHTML = '';
    if (typeof SunCalc !== 'undefined') {
        // Calculate raw distance to get an estimated travel time before the async router finishes
        const rawDistKm = map.distance([userLat, userLng], [gem.latitude, gem.longitude]) / 1000;
        const rideMins = gem.rideTimeMinutes || (rawDistKm * 1.5);
        
        // Get today's solar data for the destination coordinates
        const times = SunCalc.getTimes(new Date(), gem.latitude, gem.longitude);
        
        // Subtract ride time to figure out exactly when to start the engine
        const leaveSunrise = new Date(times.sunrise.getTime() - (rideMins * 60000));
        const leaveSunset = new Date(times.sunset.getTime() - (rideMins * 60000));
        
        const formatTime = (date) => date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        solarHTML = `
            <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; margin-bottom: 28px;">
                <div>
                    <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-weight: 800;">Sunrise</div>
                    <div style="font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">${formatTime(times.sunrise)}</div>
                    <div id="leave-sunrise-val" style="font-size: 10px; color: #00f0ff; margin-top: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Calc...</div>
                </div>
                <div style="width: 1px; background: rgba(255,255,255,0.08);"></div>
                <div style="text-align: right;">
                    <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-weight: 800;">Sunset</div>
                    <div style="font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.5px;">${formatTime(times.sunset)}</div>
                    <div id="leave-sunset-val" style="font-size: 10px; color: #00f0ff; margin-top: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Calc...</div>
                </div>
            </div>
        `;
    }

    let cafeHTML = '';
    if (gem.breakfastStop || gem.cafe) {
        cafeHTML = `
            <div style="margin-bottom: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-weight: 800;">Pit Stop</div>
                <div style="font-size: 14px; font-weight: 600; color: #d0d0d0; display: flex; align-items: center; gap: 8px;">☕ ${gem.breakfastStop || gem.cafe}</div>
            </div>
        `;
    }

    let topMatchHTML = '';
    if (currentRiderProfile && gem.personalScore >= 5) {
        topMatchHTML = `<div style="background: #FFD700; color: #000; font-size: 9px; font-weight: 900; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);">★ Top Match</div>`;
    }

    const isFav = favoritedLocations.has(gem.locationName);
    const initialHeartColor = isFav ? '#ff0055' : '#555';
    const initialGlow = isFav ? 'drop-shadow(0px 0px 8px rgba(255, 0, 85, 0.6))' : 'none';

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; width: 100%;">
            <div style="flex: 1; padding-right: 16px;">
                ${topMatchHTML}
                <div style="color: #00f0ff; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">${gem.vibeType || 'Adventure'}</div>
                <h2 style="font-size: 28px; margin: 0; line-height: 1.1; font-weight: 800; letter-spacing: -1px; color: #ffffff;">${gem.locationName}</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <button id="fav-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: ${initialHeartColor}; filter: ${initialGlow}; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; flex-shrink: 0; display: flex; justify-content: center; align-items: center; font-size: 18px;">♥</button>
                <button id="close-card-btn" style="background: none; border: none; color: #666; font-size: 24px; cursor: pointer; padding: 0; margin-top: -4px; transition: color 0.2s;">✕</button>
            </div>
        </div>
        
        ${distDurHTML}
        ${carouselHTML}
        ${generateTelemetrySVG(gem.latitude)}
        
        ${solarHTML} <!-- YOUR NEW SOLAR WIDGET IS INJECTED HERE -->
        
        <div style="margin-bottom: 28px;">
            <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: 800;">Intel</div>
            <p style="font-size: 14px; color: #a0a0a5; margin: 0; width: 100%; line-height: 1.6; font-weight: 400;">${gem.description}</p>
        </div>
        
        ${cafeHTML}
        
        <a href="https://www.google.com/maps/dir/?api=1&destination=${gem.latitude},${gem.longitude}" target="_blank" id="start-route-btn">START ROUTE</a>
    `;
    card.style.display = 'flex';

    // --- NEW: GUEST MODE ROUTING INTERCEPTOR ---
    const startRouteBtn = document.getElementById('start-route-btn');
    if (startRouteBtn) {
        startRouteBtn.addEventListener('click', (e) => {
            // Check if the user is actually logged in to Firebase
            if (!auth.currentUser) {
                e.preventDefault(); // Stop Google Maps from opening
                
                // Hide the location card
                card.style.display = 'none';
                
                // Bring the login screen back up
                const loginCard = document.getElementById('login-card');
                if (loginCard) loginCard.style.display = 'block'; 
                
                // Remove the guest UI state
                document.body.classList.remove('logged-in');
                
                // Optional: You can replace this with a custom styled alert later
                alert("Sign in to unlock live routing, premium telemetry, and save your favorite trails.");
            }
        });
    }
    
    const closeCardBtn = document.getElementById('close-card-btn');
    if (closeCardBtn) closeCardBtn.addEventListener('click', () => card.style.display = 'none');

    const favBtn = document.getElementById('fav-btn');
    favBtn.addEventListener('click', async function() {
        const currentUser = auth.currentUser;
        const trailName = gem.locationName;

        if (favoritedLocations.has(trailName)) {
            favoritedLocations.delete(trailName);
            this.style.color = '#555';
            this.style.filter = 'none';
            if (currentUser) {
                await updateDoc(doc(db, "users", currentUser.uid), { savedTrails: arrayRemove(trailName) });
            }
        } else {
            favoritedLocations.add(trailName);
            this.style.color = '#ff0055'; 
            this.style.filter = 'drop-shadow(0px 0px 8px rgba(255, 0, 85, 0.6))';
            if (currentUser) {
                await updateDoc(doc(db, "users", currentUser.uid), { savedTrails: arrayUnion(trailName) });
            }
        }
        updateSavedTrailsSidebar();
    });
}

function updateSavedTrailsSidebar() {
    const savedContainer = document.getElementById('saved-trails-list');
    if (!savedContainer) return;
    savedContainer.innerHTML = '';
    if (favoritedLocations.size === 0) { savedContainer.innerHTML = '<div style="font-size: 12px; color: #444;">No favorites saved yet.</div>'; return; }

    favoritedLocations.forEach(locationName => {
        const link = document.createElement('a');
        link.href = '#'; link.className = 'history-item'; link.innerText = locationName;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sb = document.getElementById('search-bar');
            if (sb) sb.value = locationName;
            executeSearch(); 
        });
        savedContainer.appendChild(link);
    });
}

function clearSearchBarForFilters() {
    const sb = document.getElementById('search-bar');
    if (sb && sb.value !== '') sb.value = '';
}

['distance', 'duration'].forEach(type => {
    const toggle = document.getElementById(`toggle-${type}`);
    const range = document.getElementById(`range-${type}`);
    const val = document.getElementById(`${type}-val`);
    if(toggle && range && val) {
        toggle.addEventListener('change', () => { val.style.opacity = toggle.checked ? '1' : '0.3'; clearSearchBarForFilters(); executeSearch(); });
        range.addEventListener('input', (e) => { val.innerText = `${e.target.value} ${type === 'distance' ? 'km' : 'hrs'}`; if (!toggle.checked) { toggle.checked = true; val.style.opacity = '1'; }});
        range.addEventListener('change', () => { clearSearchBarForFilters(); executeSearch(); });
    }
});

const utilityLayers = { 'toggle-petrol': L.layerGroup().addTo(map), 'toggle-food': L.layerGroup().addTo(map), 'toggle-emergency': L.layerGroup().addTo(map) };

document.querySelectorAll('.utility-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
        const toggleId = e.target.id;
        if (!e.target.checked) return utilityLayers[toggleId].clearLayers();

        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        let query = ''; let iconSVG = '';

        if (toggleId === 'toggle-petrol') { query = `node["amenity"="fuel"](${bbox});`; iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"></line><line x1="4" y1="9" x2="14" y2="9"></line><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg>`; }
        else if (toggleId === 'toggle-food') { query = `node["amenity"~"restaurant|cafe|fast_food"](${bbox});`; iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4V2"></path><line x1="7" y1="2" x2="7" y2="22"></line><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>`; }
        else if (toggleId === 'toggle-emergency') { query = `node["amenity"~"hospital|clinic|police"](${bbox});`; iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`; }

        fetch(`https://overpass-api.de/api/interpreter?data=[out:json];${query}out;`).then(res => res.json()).then(data => {
            let filteredElements = data.elements;
            if (currentRouteCoords.length > 0) {
                filteredElements = data.elements.filter(el => {
                    if (!el.lat || !el.lon) return false;
                    for (let i = 0; i < currentRouteCoords.length; i += 10) {
                        if (map.distance([el.lat, el.lon], [currentRouteCoords[i].lat, currentRouteCoords[i].lng]) < 2000) return true;
                    } return false;
                });
            }
            filteredElements.sort((a, b) => map.distance([userLat, userLng], [a.lat, a.lon]) - map.distance([userLat, userLng], [b.lat, b.lon])).slice(0, 15).forEach(el => {
                if (el.lat && el.lon) {
                    const customIcon = L.divIcon({ className: 'minimal-poi-icon', html: `<div style="background: #1a1a1a; border: 1px solid #333; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.6);">${iconSVG}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
                    const distToUser = (map.distance([userLat, userLng], [el.lat, el.lon]) / 1000).toFixed(1);
                    L.marker([el.lat, el.lon], { icon: customIcon }).addTo(utilityLayers[toggleId]).bindPopup(`<strong style="color: #ffffff;">${el.tags?.name || 'Unknown'}</strong><br><span style="color: #aaaaaa; font-size: 11px;">${distToUser} km from you</span>`);
                }
            });
        }).catch(err => console.log('Live Map API Error:', err));
    });
});

const searchBarInput = document.getElementById('search-bar');
if (searchBarInput) searchBarInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); executeSearch(); } });

// --- THE MISSING RADAR WIRE ---
const radarToggle = document.getElementById('toggle-radar');
if (radarToggle) radarToggle.addEventListener('change', () => executeSearch());

// --- GLOBAL LOADER REMOVAL (WITH FAILSAFE) ---
window.addEventListener('load', () => {
    // Attempt to hide it smoothly when everything is loaded
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.add('hidden');
    }, 800);
});

// Absolute failsafe: If the map or Firebase stalls, kill the loader after 3 seconds anyway
setTimeout(() => {
    const loader = document.getElementById('global-loader');
    if (loader && !loader.classList.contains('hidden')) {
        console.warn("Failsafe triggered: Forced loader removal.");
        loader.classList.add('hidden');
    }
}, 3000);

// --- DATABASE SEEDING UTILITY ---
async function batchUploadTrails() {
    console.log("Starting batch upload of 50 premium trails...");
    let count = 0;
    for (const gem of newHiddenGems) {
        try {
            // Generates a unique ID based on the location name (removes spaces)
            const docId = gem.locationName.replace(/\s+/g, '-').toLowerCase(); 
            await setDoc(doc(db, "trails", docId), gem);
            count++;
            console.log(`Uploaded: ${gem.locationName}`);
        } catch (error) {
            console.error(`Failed to upload ${gem.locationName}:`, error);
        }
    }
    console.log(`SUCCESS! Uploaded ${count} new trails to Firebase.`);
}

