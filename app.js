// 1. Initialize Map
const map = L.map('map', { zoomControl: false }).setView([18.5204, 73.8567], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

let currentMarkers = [];
let routingControl = null;
let currentRouteCoords = []; 
let userLat = 18.5204; 
let userLng = 73.8567; 
let userMarker = null;
let favoritedLocations = new Set(); 

// --- PREMIUM LOGIN LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-submit-btn');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const googleBtn = document.getElementById('google-login-btn');
    const guestBtn = document.getElementById('guest-btn'); // 1. Select the new button

    if (localStorage.getItem('marga_logged_in') === 'true') {
        document.body.classList.add('logged-in');
    }

    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = emailInput ? emailInput.value : '';
            const pass = passInput ? passInput.value : '';

            if (email.includes('@') && pass.length > 3) {
                localStorage.setItem('marga_logged_in', 'true');
                document.body.classList.add('logged-in');
            } else {
                alert("Please enter a valid email and password.");
            }
        });
    }

    if(googleBtn) {
        googleBtn.addEventListener('click', () => {
            localStorage.setItem('marga_logged_in', 'true');
            document.body.classList.add('logged-in');
        });
    }

    // 2. Add the Guest Mode logic
    if(guestBtn) {
        guestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // We intentionally DO NOT set localStorage here. 
            // This grants temporary access for this session only.
            document.body.classList.add('logged-in');
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

// --- BUTTONS ---
const menuBtn = document.getElementById('menu-btn');
if (menuBtn) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.add('menu-open'); });

const closeBtn = document.getElementById('close-drawer-btn');
if (closeBtn) closeBtn.addEventListener('click', () => { document.body.classList.remove('menu-open'); });

const searchBtn = document.getElementById('search-btn');
if (searchBtn) searchBtn.addEventListener('click', () => { executeSearch(); });

// === NEW: CLICK-OUTSIDE UX ===
// 1. Listen for clicks on the whole document
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    // If the menu is open, AND the click was NOT inside the sidebar, close it
    if (document.body.classList.contains('menu-open') && sidebar && !sidebar.contains(e.target)) {
        document.body.classList.remove('menu-open');
    }
});

// 2. Also close the menu if the user interacts directly with the map
map.on('click', () => {
    document.body.classList.remove('menu-open');
});
map.on('dragstart', () => {
    document.body.classList.remove('menu-open');
});


// --- UPGRADED NLP PARSER ENGINE ---
function parseConversationalQuery(rawQuery) {
    let extractedMaxMins = null;
    let extractedMaxKm = null;
    let searchKeywords = [];

    const lowerQuery = rawQuery.toLowerCase();

    // 1. Extract Hours/Minutes
    const hrMatch = lowerQuery.match(/([0-9.]+)\s*(hours|hour|hrs|hr|h)\b/);
    if (hrMatch) extractedMaxMins = parseFloat(hrMatch[1]) * 60;

    const minMatch = lowerQuery.match(/([0-9]+)\s*(minutes|minute|mins|min|m)\b/);
    if (minMatch && !hrMatch) extractedMaxMins = parseInt(minMatch[1]);

    // 2. Extract Distance
    const kmMatch = lowerQuery.match(/([0-9]+)\s*(kms|km|kilometers|kilometer)\b/);
    if (kmMatch) extractedMaxKm = parseInt(kmMatch[1]);

    // 3. Remove extracted text so it doesn't get scanned as a keyword
    let cleanText = lowerQuery;
    if (hrMatch) cleanText = cleanText.replace(hrMatch[0], '');
    if (minMatch) cleanText = cleanText.replace(minMatch[0], '');
    if (kmMatch) cleanText = cleanText.replace(kmMatch[0], '');

    // 4. THE MEGA-DICTIONARY (Words the app will actively ignore)
    const fillerWords = [
        // Pronouns, Prepositions & Common Verbs
        'i', 'want', 'to', 'go', 'for', 'a', 'ride', 'show', 'me', 'some', 'places', 
        'near', 'around', 'the', 'is', 'are', 'in', 'on', 'at', 'with', 'under', 
        'less', 'than', 'away', 'from', 'here', 'find', 'search', 'within', 'max',
        'that', 'take', 'takes', 'it', 'will', 'which', 'have', 'has', 'can', 
        'you', 'my', 'give', 'we', 'do', 'any', 'would', 'love', 'looking', 'out', 'there',
        
        // Time & Distance words (in case regex left leftovers)
        'hours', 'hour', 'hrs', 'hr', 'h', 'minutes', 'minute', 'mins', 'min', 'm',
        'kms', 'km', 'kilometers', 'kilometer', 'of',

        // Subjective Adjectives & Marketing terms (So they don't break strict searches)
        'hidden', 'gem', 'gems', 'peaceful', 'beautiful', 'nice', 'cool', 'awesome', 
        'great', 'quiet', 'scenic', 'best', 'good', 'like'
    ];
    
    const words = cleanText.split(/\s+/);
    words.forEach(word => {
        const cleanWord = word.replace(/[^a-z0-9]/g, ''); // Strip punctuation
        if (cleanWord && !fillerWords.includes(cleanWord) && isNaN(cleanWord)) {
            searchKeywords.push(cleanWord);
        }
    });

    return { extractedMaxMins, extractedMaxKm, searchKeywords };
}


// --- SEARCH ENGINE & FILTERS ---
function executeSearch() {
    const searchInput = document.getElementById('search-bar');
    const query = searchInput ? searchInput.value.trim() : '';
    
    document.body.classList.add('map-active');
    
    // Wipe current pins off the map
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
    
    if (routingControl) { 
        try { routingControl.getPlan().setWaypoints([]); } catch(e){}
        map.removeControl(routingControl); 
        routingControl = null; 
        currentRouteCoords = []; 
        
        document.querySelectorAll('.utility-toggle').forEach(cb => {
            if (cb.checked) {
                cb.checked = false; 
                utilityLayers[cb.id].clearLayers(); 
            }
        });
    }
    
    const locationCard = document.getElementById('location-card');
    if (locationCard) locationCard.style.display = 'none';

    // Parse the conversational intent
    const smartQuery = parseConversationalQuery(query);

    // Get states of UI toggles
    const toggleDist = document.getElementById('toggle-distance');
    const toggleDur = document.getElementById('toggle-duration');
    const isDistActive = toggleDist && toggleDist.checked;
    const isDurActive = toggleDur && toggleDur.checked;

    const activeUtilities = [];
    document.querySelectorAll('.utility-toggle').forEach(cb => {
        if (cb.checked) activeUtilities.push(cb.getAttribute('data-query').toLowerCase());
    });
    
    if (query === '' && !isDistActive && !isDurActive && activeUtilities.length === 0) return; 

    const cacheBuster = new Date().getTime();
    
    fetch(`database.json?v=${cacheBuster}`)
        .then(response => response.json())
        .then(data => {
            // STEP 1: Filter out anything that fails Distance, Duration, or Utility constraints
            let matchedGems = data.filter(gem => {
                let isMatch = true;
                if (!gem.latitude || !gem.longitude) return false;

                // --- DISTANCE CHECK & 200KM HARD CAP ---
                const distKm = map.distance([userLat, userLng], [gem.latitude, gem.longitude]) / 1000;
                let currentMaxKm = 200; 
                if (smartQuery.extractedMaxKm) {
                    currentMaxKm = smartQuery.extractedMaxKm;
                } else if (isDistActive) {
                    currentMaxKm = parseInt(document.getElementById('range-distance').value);
                }
                
                if (distKm > currentMaxKm) isMatch = false;

                // --- DURATION CHECK ---
                if (isMatch) {
                    const estTime = gem.rideTimeMinutes || (distKm * 1.5);
                    if (smartQuery.extractedMaxMins) {
                        if (estTime > smartQuery.extractedMaxMins) isMatch = false;
                    } else if (isDurActive) {
                        const maxDurHrs = parseFloat(document.getElementById('range-duration').value);
                        if (estTime > (maxDurHrs * 60)) isMatch = false;
                    }
                }

                // --- UTILITY CHECK ---
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

            // STEP 2: THE TWO-PASS KEYWORD CHECK (Title Priority)
            if (smartQuery.searchKeywords.length > 0) {
                // Pass 1: Try to match exactly against the Location Name
                let titleMatches = matchedGems.filter(gem => {
                    const nameText = (gem.locationName || '').toLowerCase();
                    return smartQuery.searchKeywords.every(kw => nameText.includes(kw));
                });

                if (titleMatches.length > 0) {
                    // We found a specific place! Ignore descriptions to avoid clutter.
                    matchedGems = titleMatches;
                } else {
                    // Pass 2: No names matched perfectly. Search descriptions for generic queries (e.g. "waterfall")
                    matchedGems = matchedGems.filter(gem => {
                        const searchableText = `${gem.locationName || ''} ${gem.description || ''} ${gem.vibeType || ''} ${gem.category || ''} ${gem.subCategory || ''}`.toLowerCase();
                        return smartQuery.searchKeywords.every(kw => searchableText.includes(kw));
                    });
                }
            }

            // STEP 3: Draw the Pins
            if (matchedGems.length > 0) {
                let bounds = [[userLat, userLng]];
                matchedGems.forEach((gem) => {
                    const markerOptions = {
                        radius: 5,
                        fillColor: '#00f0ff',
                        color: '#fff',
                        weight: 1,
                        opacity: 0.8,
                        fillOpacity: 1
                    };
                    const marker = L.circleMarker([gem.latitude, gem.longitude], markerOptions).addTo(map);
                    
                    currentMarkers.push(marker);
                    bounds.push([gem.latitude, gem.longitude]);

                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (routingControl) {
                            try { routingControl.getPlan().setWaypoints([]); } catch(e){}
                            map.removeControl(routingControl);
                            currentRouteCoords = [];
                        }
                        calculateRoute(gem.latitude, gem.longitude);
                        showLocationCard(gem);
                    });
                });
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
            } else {
                alert("No trails found within your parameters. Try expanding your search or turning off some filters!");
            }
        })
        .catch(err => console.error("Database Error:", err));
}


// --- ROUTING ---
function calculateRoute(destLat, destLng) {
    routingControl = L.Routing.control({
        waypoints: [ L.latLng(userLat, userLng), L.latLng(destLat, destLng) ],
        show: false, addWaypoints: true, routeWhileDragging: true, createMarker: function() { return null; },
        lineOptions: { styles: [{ color: '#00f0ff', opacity: 0.8, weight: 4 }] }
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        currentRouteCoords = routes[0].coordinates;
        
        const realDistanceKm = (summary.totalDistance / 1000).toFixed(1); 
        const rawMinutes = summary.totalTime / 60;
        
        let realisticMinutes = 0;
        
        if (realDistanceKm < 15) {
            realisticMinutes = Math.round(rawMinutes * 1.8);
        } else if (realDistanceKm >= 15 && realDistanceKm < 50) {
            realisticMinutes = Math.round(rawMinutes * 1.4);
        } else {
            realisticMinutes = Math.round(rawMinutes * 1.2);
        }
        
        const hrs = Math.floor(realisticMinutes / 60);
        const mins = Math.floor(realisticMinutes % 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

        const distUI = document.getElementById('live-distance');
        const durUI = document.getElementById('live-duration');
        
        if (distUI) distUI.innerText = `${realDistanceKm} km`;
        if (durUI) durUI.innerText = timeStr;
    });
}


// --- LOCATION CARD UI ---
function showLocationCard(gem) {
    const card = document.getElementById('location-card');
    if (!card) return;
    
    let carouselHTML = '';
    if (gem.images && gem.images.length > 0) {
        const imageTags = gem.images.map(imgUrl => `<img src="${imgUrl}" alt="Scenery" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">`).join('');
        carouselHTML = `<div class="photo-carousel" style="display: flex; gap: 12px; overflow-x: auto; margin-bottom: 24px; padding-bottom: 4px;">${imageTags}</div>`;
    } else {
        carouselHTML = `
        <div class="photo-carousel" style="display: flex; gap: 12px; overflow-x: auto; margin-bottom: 24px; padding-bottom: 4px;">
            <img src="https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=300&q=80" alt="Placeholder 1" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">
            <img src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=300&q=80" alt="Placeholder 2" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">
            <img src="https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?auto=format&fit=crop&w=300&q=80" alt="Placeholder 3" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">
        </div>`;
    }

    let tempDist = gem.distanceKm ? `${gem.distanceKm} km` : 'Calc...';
    let tempTime = 'Calc...';
    if (gem.rideTimeMinutes) {
        const h = Math.floor(gem.rideTimeMinutes / 60);
        const m = gem.rideTimeMinutes % 60;
        tempTime = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    let distDurHTML = `
        <div style="display: flex; margin-bottom: 24px; align-items: center;">
            <div style="flex: 1; padding-right: 16px;">
                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; font-weight: 600;">Distance</div>
                <div id="live-distance" style="font-size: 20px; font-weight: 700; color: #fff; transition: color 0.3s ease;">${tempDist}</div>
            </div>
            <div style="width: 1px; height: 36px; background: rgba(255, 255, 255, 0.15);"></div>
            <div style="flex: 1; padding-left: 16px;">
                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; font-weight: 600;">Duration</div>
                <div id="live-duration" style="font-size: 20px; font-weight: 700; color: #fff; transition: color 0.3s ease;">${tempTime}</div>
            </div>
        </div>
    `;

    let cafeHTML = '';
    if (gem.breakfastStop || gem.cafe) {
        cafeHTML = `
            <div style="margin-bottom: 36px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; font-weight: 600;">Pit Stop</div>
                <div style="font-size: 15px; font-weight: 600; color: #e0e0e0; display: flex; align-items: center; gap: 6px;">
                    ☕ ${gem.breakfastStop || gem.cafe}
                </div>
            </div>
        `;
    }

    const isFav = favoritedLocations.has(gem.locationName);
    const initialHeartColor = isFav ? '#ff0055' : '#888';
    const initialGlow = isFav ? 'drop-shadow(0px 0px 6px rgba(255, 0, 85, 0.8))' : 'none';

    // UPDATED: Added the close button right next to the favorite button here
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; width: 100%;">
            <div style="flex: 1; padding-right: 16px;">
                <div style="color: #00f0ff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">${gem.vibeType || 'Adventure'}</div>
                <h2 style="font-size: 24px; margin: 0; line-height: 1.2; font-weight: 700; color: #ffffff;">${gem.locationName}</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
                <button id="fav-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.1); color: ${initialHeartColor}; filter: ${initialGlow}; border-radius: 50%; width: 42px; height: 42px; cursor: pointer; flex-shrink: 0; transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; justify-content: center; align-items: center; font-size: 18px;">♥</button>
                <button id="close-card-btn" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer; padding: 0; margin-top: -4px; transition: color 0.2s;">✕</button>
            </div>
        </div>
        
        ${distDurHTML}
        ${carouselHTML}
        
        <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; font-weight: 600;">Description</div>
            <p style="font-size: 13.5px; color: #cccccc; margin: 0; width: 100%; line-height: 1.6;">${gem.description}</p>
        </div>
        
        ${cafeHTML}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${gem.latitude},${gem.longitude}" target="_blank" style="display: block; width: 100%; padding: 16px 0; background: #00f0ff; color: #000; border-radius: 12px; text-align: center; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 4px 12px rgba(0, 240, 255, 0.15);">START ROUTE</a>
    `;
    card.style.display = 'flex';
    
    // NEW: Close Button Logic
    const closeCardBtn = document.getElementById('close-card-btn');
    if (closeCardBtn) {
        closeCardBtn.addEventListener('click', () => {
            card.style.display = 'none';
        });
    }

    const favBtn = document.getElementById('fav-btn');
    favBtn.addEventListener('click', function() {
        if (favoritedLocations.has(gem.locationName)) {
            favoritedLocations.delete(gem.locationName);
            this.style.color = '#888';
            this.style.filter = 'none';
            this.style.transform = 'scale(1)';
        } else {
            favoritedLocations.add(gem.locationName);
            this.style.color = '#ff0055'; 
            this.style.filter = 'drop-shadow(0px 0px 6px rgba(255, 0, 85, 0.8))';
            this.style.transform = 'scale(1.3)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        }
        updateSavedTrailsSidebar();
    });
}

// --- UPDATE SIDEBAR UI ---
function updateSavedTrailsSidebar() {
    const savedContainer = document.getElementById('saved-trails-list');
    if (!savedContainer) return;

    savedContainer.innerHTML = '';

    if (favoritedLocations.size === 0) {
        savedContainer.innerHTML = '<div style="font-size: 12px; color: #444;">No favorites saved yet.</div>';
        return;
    }

    favoritedLocations.forEach(locationName => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'history-item'; 
        link.innerText = locationName;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const searchBar = document.getElementById('search-bar');
            if (searchBar) searchBar.value = locationName;
            document.body.classList.remove('menu-open'); 
            executeSearch(); 
        });

        savedContainer.appendChild(link);
    });
}


// --- SIDEBAR UTILITIES ---
function clearSearchBarForFilters() {
    const sb = document.getElementById('search-bar');
    if (sb && sb.value !== '') {
        sb.value = '';
    }
}

const toggleDist = document.getElementById('toggle-distance');
const rangeDist = document.getElementById('range-distance');
const distVal = document.getElementById('distance-val');

if(toggleDist && rangeDist && distVal) {
    toggleDist.addEventListener('change', () => { 
        distVal.style.opacity = toggleDist.checked ? '1' : '0.3'; 
        clearSearchBarForFilters(); 
        executeSearch(); 
    });
    rangeDist.addEventListener('input', (e) => { 
        distVal.innerText = `${e.target.value} km`; 
        if (!toggleDist.checked) {
            toggleDist.checked = true;
            distVal.style.opacity = '1';
        }
    });
    rangeDist.addEventListener('change', () => { 
        clearSearchBarForFilters(); 
        executeSearch(); 
    });
}

const toggleDur = document.getElementById('toggle-duration');
const rangeDur = document.getElementById('range-duration');
const durVal = document.getElementById('duration-val');

if(toggleDur && rangeDur && durVal) {
    toggleDur.addEventListener('change', () => { 
        durVal.style.opacity = toggleDur.checked ? '1' : '0.3'; 
        clearSearchBarForFilters(); 
        executeSearch(); 
    });
    rangeDur.addEventListener('input', (e) => { 
        durVal.innerText = `${e.target.value} hrs`; 
        if (!toggleDur.checked) {
            toggleDur.checked = true;
            durVal.style.opacity = '1';
        }
    });
    rangeDur.addEventListener('change', () => { 
        clearSearchBarForFilters(); 
        executeSearch(); 
    });
}

// --- LIVE REAL-WORLD MAP UTILITIES (Overpass API) ---

const utilityLayers = {
    'toggle-petrol': L.layerGroup().addTo(map),
    'toggle-food': L.layerGroup().addTo(map),
    'toggle-emergency': L.layerGroup().addTo(map)
};

const utilityToggles = document.querySelectorAll('.utility-toggle');
utilityToggles.forEach(toggle => {
    toggle.addEventListener('change', (e) => {
        const toggleId = e.target.id;
        const isChecked = e.target.checked;
        
        if (!isChecked) {
            utilityLayers[toggleId].clearLayers();
            return;
        }

        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        
        let query = '';
        let iconSVG = '';

        if (toggleId === 'toggle-petrol') {
            query = `node["amenity"="fuel"](${bbox});`;
            iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"></line><line x1="4" y1="9" x2="14" y2="9"></line><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg>`;
        } else if (toggleId === 'toggle-food') {
            query = `node["amenity"~"restaurant|cafe|fast_food"](${bbox});`;
            iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4V2"></path><line x1="7" y1="2" x2="7" y2="22"></line><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>`;
        } else if (toggleId === 'toggle-emergency') {
            query = `node["amenity"~"hospital|clinic|police"](${bbox});`;
            iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
        }

        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];${query}out;`;
        
        fetch(overpassUrl)
            .then(res => res.json())
            .then(data => {
                
                let filteredElements = data.elements;
                
                if (currentRouteCoords.length > 0) {
                    filteredElements = data.elements.filter(el => {
                        if (!el.lat || !el.lon) return false;
                        for (let i = 0; i < currentRouteCoords.length; i += 10) {
                            const pt = currentRouteCoords[i];
                            if (map.distance([el.lat, el.lon], [pt.lat, pt.lng]) < 2000) { 
                                return true;
                            }
                        }
                        return false;
                    });
                }
                
                const sortedElements = filteredElements.sort((a, b) => {
                    if (!a.lat || !b.lat) return 0;
                    const distA = map.distance([userLat, userLng], [a.lat, a.lon]);
                    const distB = map.distance([userLat, userLng], [b.lat, b.lon]);
                    return distA - distB; 
                });

                const closestResults = sortedElements.slice(0, 15);
                
                closestResults.forEach(el => {
                    if (el.lat && el.lon) {
                        const customIcon = L.divIcon({
                            className: 'minimal-poi-icon',
                            html: `<div style="background: #1a1a1a; border: 1px solid #333; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.6);">${iconSVG}</div>`,
                            iconSize: [26, 26],
                            iconAnchor: [13, 13]
                        });
                        
                        const name = el.tags && el.tags.name ? el.tags.name : 'Unknown Location';
                        const distToUser = (map.distance([userLat, userLng], [el.lat, el.lon]) / 1000).toFixed(1);
                        
                        L.marker([el.lat, el.lon], { icon: customIcon }).addTo(utilityLayers[toggleId])
                          .bindPopup(`<strong style="color: #ffffff;">${name}</strong><br><span style="color: #aaaaaa; font-size: 11px;">${distToUser} km from you</span>`);
                    }
                });
            })
            .catch(err => console.log('Live Map API Error:', err));
    });
});


// --- SIDEBAR QUICK LINKS (History & Hot Spots) ---
const historyItems = document.querySelectorAll('.history-item');

historyItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault(); 
        const query = item.getAttribute('data-query');
        const searchBar = document.getElementById('search-bar');
        if (searchBar) {
            searchBar.value = query;
        }
        document.body.classList.remove('menu-open');
        executeSearch();
    });
});

// --- SEARCH BAR ENTER KEY LISTENER ---
const searchBarInput = document.getElementById('search-bar');
if (searchBarInput) {
    searchBarInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents the page from refreshing
            executeSearch();    // Triggers the smart search
        }
    });
}