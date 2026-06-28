// 1. IMPORT FIREBASE 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
// Add the Mapbox map background. We try to get the token from the backend
// (/api/config), but if that isn't available — e.g. the page is opened without
// the server running — we fall back to a built-in token so the map ALWAYS shows.
const FALLBACK_MAPBOX_TOKEN = 'pk.eyJ1IjoidmFuc2htMjAwNCIsImEiOiJjbXB1c2lmOHExZ3Y4MnFzZWhoZXoyN2xlIn0.zA6kBde68WK6YdB1tJQ0Fw';

function addMapTiles(token) {
    L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${token}`, {
        tileSize: 512, zoomOffset: -1, maxZoom: 19, attribution: '© Mapbox © OpenStreetMap'
    }).addTo(map);
}

fetch('/api/config')
    .then(r => r.json())
    .then(cfg => addMapTiles(cfg.mapboxToken || FALLBACK_MAPBOX_TOKEN))
    .catch(() => addMapTiles(FALLBACK_MAPBOX_TOKEN));

let currentMarkers = [];
let heatLayer = null;
let routingControl = null;
let activeRouteLayers = [];
let currentRouteCoords = []; 
let userLat = 18.5204; 
let userLng = 73.8567; 
let userMarker = null; 
let currentRiderProfile = null; 
let favoritedLocations = new Set(); 

// --- DYNAMIC SMART CARDS FUNCTION ---
function updateRecommendedCards(trailsData) {
    const container = document.getElementById('recommended-container');
    if (!container) return;

    const sortedTrails = trailsData
        .filter(t => t.latitude && t.longitude)
        .map(t => {
            const dist = map.distance([userLat, userLng], [t.latitude, t.longitude]) / 1000;
            return { ...t, distance: dist, time: Math.round(dist * 1.5) }; 
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3); 

    if (sortedTrails.length === 0) {
        container.innerHTML = `<div class="col-span-3 text-primary/30 text-[13px] italic">No local trails found nearby. Try searching globally!</div>`;
        return;
    }

    container.innerHTML = sortedTrails.map(trail => {
        let safeLocName = trail.locationName.replace(/'/g, "\\'"); 

        let timeString = '';
        const h = Math.floor(trail.time / 60);
        const m = trail.time % 60;
        if(h > 0) timeString += `${h}h `;
        timeString += `${m}m`;
        
        let excerpt = trail.description ? trail.description : 'Scenic route with great views. Perfect for a quick escape from the city.';

        return `
            <a onclick="window.launchApp('${safeLocName}')" class="group relative block cursor-pointer h-full">
                <div class="h-full w-full overflow-hidden rounded-2xl bg-[#0a0a0c] border border-white/5 flex flex-col p-6 relative transition-all duration-300 hover:border-[#00f0ff]/30" style="min-height: 240px;">
                    <div class="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div class="relative z-10 flex flex-col h-full">
                        
                        <div class="mb-4">
                            <div style="color: #00f0ff; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
                                ${trail.vibeType || 'Ride'}
                            </div>
                            <h3 style="font-size: 24px; margin: 0; line-height: 1.1; font-weight: 800; letter-spacing: -1px; color: #ffffff;">
                                ${trail.locationName}
                            </h3>
                        </div>
                        
                        <div class="flex-grow mb-6">
                            <p style="font-size: 13px; color: #888; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-weight: 400;">
                                ${excerpt}
                            </p>
                        </div>
                        
                        <div style="display: flex; align-items: center; margin-top: auto;">
                            <div style="flex: 1; padding-right: 16px;">
                                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; font-weight: 800;">Distance</div>
                                <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${trail.distance.toFixed(1)} km</div>
                            </div>
                            <div style="width: 1px; height: 32px; background: rgba(255, 255, 255, 0.08);"></div>
                            <div style="flex: 1; padding-left: 20px;">
                                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; font-weight: 800;">Duration</div>
                                <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">${timeString}</div>
                            </div>
                        </div>
                        
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

// --- LOGIN & AUTH LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-submit-btn');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const googleBtn = document.getElementById('google-login-btn');
    const guestBtn = document.getElementById('guest-btn');
    
    // Bind both logout buttons (Gateway and Map)
    const logoutBtn = document.getElementById('logout-btn');
    const gatewayLogoutBtn = document.getElementById('gateway-logout-btn');
    
    const loginStep = document.getElementById('login-step');
    const qStep = document.getElementById('questionnaire-step');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    let isInitialAuthCheck = true; // Prevents gateway closing on page refresh

    document.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const searchBar = document.getElementById('search-bar');
            if(searchBar) {
                searchBar.value = this.getAttribute('data-query');
                executeSearch();
            }
        });
    });

    document.querySelectorAll('.mcq-option').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('multi')) this.classList.toggle('selected');
            else {
                this.parentElement.querySelectorAll('.mcq-option').forEach(sib => sib.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
    });

    async function routeUser(user, isInitialLoad = false) {
        let userSnap = await getDoc(doc(db, "users", user.uid));
        
        if (!userSnap.exists()) {
            await setDoc(doc(db, "users", user.uid), { email: user.email, bikeModel: "Unknown", savedTrails: [], createdAt: new Date() });
            userSnap = await getDoc(doc(db, "users", user.uid));
        }

        const data = userSnap.data();
        
        // CHECK IF THEY ARE NEW
        if (data.bikeModel === "Unknown" || !data.bikeModel) {
            
            const authModal = document.getElementById('auth-modal');
            const blurOverlay = document.getElementById('modal-blur-overlay');
            if (blurOverlay) {
                blurOverlay.style.display = 'block';
                blurOverlay.style.pointerEvents = 'auto';
                setTimeout(() => { blurOverlay.style.opacity = '1'; }, 10);
            }
            if (authModal) {
                authModal.style.display = 'flex';
                authModal.style.opacity = '1';
                authModal.style.visibility = 'visible';
                authModal.style.pointerEvents = 'auto';
            }
            
            if (loginStep) loginStep.style.opacity = '0'; 
            
            setTimeout(() => {
                if (loginStep) {
                    loginStep.classList.remove('active-view');
                    loginStep.style.display = 'none';
                }
                if (qStep) {
                    qStep.classList.add('active-view'); 
                    qStep.style.display = 'block';
                }
                setTimeout(() => { if (qStep) qStep.style.opacity = '1'; }, 50);
            }, 300);

        } else {
            // THEY ARE AN EXISTING USER
            currentRiderProfile = data;
            favoritedLocations.clear();
            if (data.savedTrails && data.savedTrails.length > 0) {
                data.savedTrails.forEach(trail => favoritedLocations.add(trail));
            }
            updateSavedTrailsSidebar(); 
            
            const displayName = user.displayName || user.email.split('@')[0];
            const initial = (user.displayName || user.email)[0].toUpperCase();
            
            // Map UI Avatar Sync
            const mapPillName = document.getElementById('map-pill-name');
            if (mapPillName) mapPillName.innerText = displayName;
            const mapProfileName = document.getElementById('profile-name');
            if (mapProfileName) mapProfileName.innerText = displayName;
            const mapAvatar = document.getElementById('profile-avatar');
            if (mapAvatar) mapAvatar.innerText = initial;
            const mapProfileTag = document.getElementById('profile-tag');
            if (mapProfileTag) mapProfileTag.innerText = `${data.bikeModel} | ${data.skillLevel}`;
            
            // Gateway UI Avatar Sync
            const gwAvatar = document.getElementById('gateway-user-avatar');
            if (gwAvatar) gwAvatar.innerText = initial;
            const gwWelcome = document.getElementById('gateway-welcome-text');
            if (gwWelcome) gwWelcome.innerText = displayName;
            const gwProfileName = document.getElementById('gateway-profile-name');
            if (gwProfileName) gwProfileName.innerText = displayName;
            const gwProfileTag = document.getElementById('gateway-profile-tag');
            if (gwProfileTag) gwProfileTag.innerText = `${data.bikeModel} | ${data.skillLevel}`;
            
            document.body.classList.add('logged-in'); 
            
            if (window.closeAuthModal) window.closeAuthModal();
            
            // Only dismiss the Gateway if this was a manual login
            if (isInitialLoad === false && document.body.classList.contains('gateway-active')) {
                document.body.classList.remove('gateway-active');
                const gateway = document.getElementById('marga-gateway');
                if (gateway) {
                    gateway.style.opacity = '0';
                    gateway.style.pointerEvents = 'none';
                    setTimeout(() => { gateway.style.display = 'none'; }, 800);
                }
            }

            executeSearch();
        }
    }

    // Applies the guest ("Preview Mode") UI when there's no Firebase user.
    function applyGuestState() {
        document.body.classList.add('logged-in');
        if (window.closeAuthModal) window.closeAuthModal();

        const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
        setText('map-pill-name', 'Guest Rider');
        setText('profile-name', 'Guest Rider');
        setText('profile-avatar', 'G');
        setText('profile-tag', 'Preview Mode');

        if (document.body.classList.contains('gateway-active')) {
            document.body.classList.remove('gateway-active');
            const gateway = document.getElementById('marga-gateway');
            if (gateway) {
                gateway.style.opacity = '0';
                gateway.style.pointerEvents = 'none';
                setTimeout(() => { gateway.style.display = 'none'; }, 800);
            }
        }

        executeSearch();
    }

    // Guest mode survives refresh via sessionStorage — apply it immediately, before
    // Firebase's async callback resolves, so there's no flash of the gateway/login.
    if (sessionStorage.getItem('marga_guest') === 'true') {
        applyGuestState();
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            sessionStorage.removeItem('marga_guest'); // a real account replaces guest mode
            routeUser(user, isInitialAuthCheck);
        } else if (sessionStorage.getItem('marga_guest') === 'true') {
            // Keep guest mode active instead of tearing the UI down.
            if (!document.body.classList.contains('logged-in')) applyGuestState();
        } else {
            document.body.classList.remove('logged-in');
            document.body.classList.remove('menu-open'); 
            document.body.classList.remove('card-open'); 
            
            if (window.closeAuthModal) window.closeAuthModal();
            
            if (qStep) { qStep.classList.remove('active-view'); qStep.style.display = 'none'; qStep.style.opacity = '0'; }
            if (loginStep) { loginStep.classList.add('active-view'); loginStep.style.display = 'block'; loginStep.style.opacity = '1'; }
            
            // Reset Map UI
            const mapPillName = document.getElementById('map-pill-name');
            if (mapPillName) mapPillName.innerText = "Guest Rider";
            const profileName = document.getElementById('profile-name');
            if (profileName) profileName.innerText = "Guest Rider";
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar) profileAvatar.innerText = "G";
            const profileTag = document.getElementById('profile-tag');
            if (profileTag) profileTag.innerText = "Preview Mode";
            
            // Reset Gateway UI
            const gwAvatar = document.getElementById('gateway-user-avatar');
            if (gwAvatar) gwAvatar.innerText = 'G';
            const gwWelcome = document.getElementById('gateway-welcome-text');
            if (gwWelcome) gwWelcome.innerText = 'Welcome';
            const gwProfileName = document.getElementById('gateway-profile-name');
            if (gwProfileName) gwProfileName.innerText = 'Guest Rider';
            const gwProfileTag = document.getElementById('gateway-profile-tag');
            if (gwProfileTag) gwProfileTag.innerText = 'Preview Mode';
            
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
        isInitialAuthCheck = false; // Next time it fires, it will be a manual action
    });

    // Logging out always clears guest mode. A guest has no Firebase user, so
    // signOut() won't fire onAuthStateChanged — reload to return to the gateway.
    const handleLogout = () => {
        sessionStorage.removeItem('marga_guest');
        if (auth.currentUser) {
            signOut(auth);
        } else {
            location.reload();
        }
    };
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (gatewayLogoutBtn) gatewayLogoutBtn.addEventListener('click', handleLogout);

    if (saveProfileBtn) saveProfileBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        const selectedBike = document.querySelector('#bike-group .mcq-option.selected')?.getAttribute('data-value') || 'ADV';
        const selectedSkill = document.querySelector('#skill-group .mcq-option.selected')?.getAttribute('data-value') || 'Beginner';
        const selectedVibes = Array.from(document.querySelectorAll('#vibe-group .mcq-option.selected')).map(el => el.getAttribute('data-value'));
        
        document.body.classList.add('logged-in'); 
        
        if (window.closeAuthModal) window.closeAuthModal();

        if (document.body.classList.contains('gateway-active')) {
            document.body.classList.remove('gateway-active');
            const gateway = document.getElementById('marga-gateway');
            if (gateway) {
                gateway.style.opacity = '0';
                gateway.style.pointerEvents = 'none';
                setTimeout(() => { gateway.style.display = 'none'; }, 800);
            }
        }
        
        await updateDoc(doc(db, "users", user.uid), { bikeModel: selectedBike, skillLevel: selectedSkill, idealVibes: selectedVibes });
        routeUser(user, false);
    });

    if (googleBtn) googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const userSnap = await getDoc(doc(db, "users", result.user.uid));
            if (!userSnap.exists()) await setDoc(doc(db, "users", result.user.uid), { email: result.user.email, bikeModel: "Unknown", savedTrails: [] });
        } catch (e) { console.error(e); }
    });

    // --- LOGIN / SIGNUP MODE TOGGLE ---
    const nameInput = document.getElementById('login-name');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authToggleLead = document.getElementById('auth-toggle-lead');
    const forgotLink = document.getElementById('forgot-pass-link');
    const FORGOT_DEFAULT_TEXT = forgotLink ? forgotLink.innerText : 'Forgot password?';
    let forgotMsgTimer = null;

    let authMode = 'login'; // 'login' | 'signup'

    function setAuthMode(mode) {
        authMode = mode;
        resetForgotLink();
        if (mode === 'signup') {
            if (nameInput) nameInput.style.display = 'block';
            if (loginBtn) loginBtn.innerText = 'Create Account';
            if (authToggleLead) authToggleLead.innerText = 'Already have an account? ';
            if (authToggleLink) authToggleLink.innerText = 'Sign in';
            if (nameInput) nameInput.focus();
        } else {
            if (nameInput) nameInput.style.display = 'none';
            if (loginBtn) loginBtn.innerText = 'Continue';
            if (authToggleLead) authToggleLead.innerText = 'New rider? ';
            if (authToggleLink) authToggleLink.innerText = 'Create an account';
            if (emailInput) emailInput.focus();
        }
    }

    if (authToggleLink) {
        authToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            setAuthMode(authMode === 'login' ? 'signup' : 'login');
        });
    }

    // --- FORGOT PASSWORD (all feedback inline; no popups) ---
    function resetForgotLink() {
        clearTimeout(forgotMsgTimer);
        if (!forgotLink) return;
        forgotLink.innerText = FORGOT_DEFAULT_TEXT;
        forgotLink.style.color = '#888';
        forgotLink.style.opacity = '1';
        forgotLink.style.pointerEvents = 'auto';
    }

    // Replace the link in-place with a message, then fade out and restore it.
    function showForgotMessage(msg, color) {
        if (!forgotLink) return;
        clearTimeout(forgotMsgTimer);
        forgotLink.innerText = msg;
        forgotLink.style.color = color;
        forgotLink.style.transition = 'opacity 0.5s ease';
        forgotLink.style.opacity = '1';
        forgotLink.style.pointerEvents = 'none'; // it's a message now, not a link
        forgotMsgTimer = setTimeout(() => {
            forgotLink.style.opacity = '0';       // fade out after 4s
            setTimeout(resetForgotLink, 500);     // then restore the link
        }, 4000);
    }

    // Shake the email input + flash a red border, without sending.
    function shakeEmail() {
        if (!emailInput) return;
        emailInput.style.setProperty('border', '1px solid #ff4444', 'important');
        emailInput.classList.remove('input-shake');
        void emailInput.offsetWidth; // force reflow so the animation can replay
        emailInput.classList.add('input-shake');
        setTimeout(() => {
            emailInput.classList.remove('input-shake');
            emailInput.style.setProperty('border', '1px solid rgba(255,255,255,0.1)', 'important');
        }, 800);
    }

    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = emailInput ? emailInput.value.trim() : '';

            // Empty field → shake instead of sending.
            if (!email) { shakeEmail(); return; }

            try {
                await sendPasswordResetEmail(auth, email);
                showForgotMessage('Reset link sent to your email', '#00f0ff');
            } catch (err) {
                let msg = 'Could not send reset link';
                if (err.code === 'auth/invalid-email') msg = 'That email looks invalid';
                else if (err.code === 'auth/user-not-found') msg = 'No account found for that email';
                showForgotMessage(msg, '#ff4444');
            }
        });
    }

    const showAuthError = (msg) => {
        let errEl = document.getElementById('auth-error-msg');
        if (!errEl) {
            errEl = document.createElement('div');
            errEl.id = 'auth-error-msg';
            errEl.style.cssText = 'color:#ff4d4d;font-size:13px;margin:-16px 0 16px;text-align:center;';
            loginBtn.parentNode.insertBefore(errEl, loginBtn);
        }
        errEl.textContent = msg;
    };

    const clearAuthError = () => {
        const errEl = document.getElementById('auth-error-msg');
        if (errEl) errEl.textContent = '';
    };

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            clearAuthError();
            const email = emailInput ? emailInput.value.trim() : '';
            const pass = passInput ? passInput.value.trim() : '';
            if (!email.includes('@') || pass.length < 6) return showAuthError("Enter a valid email and a password of at least 6 characters.");

            if (authMode === 'signup') {
                const name = nameInput ? nameInput.value.trim() : '';
                if (!name) return showAuthError("Please enter your name.");
                try {
                    const res = await createUserWithEmailAndPassword(auth, email, pass);
                    await updateProfile(res.user, { displayName: name });
                    await setDoc(doc(db, "users", res.user.uid), { email: res.user.email, displayName: name, authProvider: "email", bikeModel: "Unknown", savedTrails: [], createdAt: new Date() });
                    routeUser(res.user, false);
                } catch (err) { showAuthError(err.message); }
            } else {
                try {
                    await signInWithEmailAndPassword(auth, email, pass);
                } catch (error) {
                    showAuthError(error.code === 'auth/invalid-credential' ? "Incorrect email or password." : error.message);
                }
            }
        });
    }

    if (guestBtn) {
        guestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('marga_guest', 'true'); // remember guest mode across refresh
            document.body.classList.add('logged-in');
            
            if (window.closeAuthModal) window.closeAuthModal();

            if (document.body.classList.contains('gateway-active')) {
                document.body.classList.remove('gateway-active');
                const gateway = document.getElementById('marga-gateway');
                if (gateway) {
                    gateway.style.opacity = '0';
                    gateway.style.pointerEvents = 'none';
                    setTimeout(() => { gateway.style.display = 'none'; }, 800);
                }
            }
            
            executeSearch(); 
        });
    }
});

// --- GPS & FETCH FOR SMART CARDS ---
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            const gpsIcon = L.divIcon({ className: 'user-location-marker', iconSize: [12, 12], iconAnchor: [6, 6] });
            userMarker = L.marker([userLat, userLng], { icon: gpsIcon, zIndexOffset: 1000 }).addTo(map);

            try {
                const snapshot = await getDocs(collection(db, "trails"));
                const trailsData = snapshot.docs.map(doc => doc.data());
                updateRecommendedCards(trailsData);
            } catch (err) {
                console.error("Failed to load trails for Smart Cards:", err);
            }
        },
        (error) => { 
            console.warn("Geolocation denied."); 
            const container = document.getElementById('recommended-container');
            if (container) container.innerHTML = `<div class="col-span-3 text-primary/30 text-[13px] italic">Enable location services to see local top rides.</div>`;
        },
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

    const fillerWords = ['pradesh','nadu','state','rides','ride','place','places','i','want','to','go','for','a','show','me','some','near','around','the','is','are','in','on','at','with','under','less','than','away','from','here','find','search','within','max','that','take','takes','it','will','which','have','has','can','you','my','give','we','do','any','would','love','looking','out','there','hours','hour','hrs','hr','h','minutes','minute','mins','min','m','kms','km','kilometers','kilometer','of','something','few','good','nice','great','quick','long','short','fun','cool','awesome','best','top','perfect','easy','close','nearby','local','suggest','recommendation','take','drive','trip','visit','explore','beautiful','pretty','epic','amazing','somewhere','anything','kind','type','sort','bit','lot','little','big'];
    
    cleanText.split(/\s+/).forEach(word => {
        let cleanWord = word.replace(/[^a-z0-9]/g, ''); 
        
        if(cleanWord === 'lakes') cleanWord = 'lake';
        if(cleanWord === 'dams') cleanWord = 'dam';
        if(cleanWord === 'viewpoints') cleanWord = 'viewpoint';
        if(cleanWord === 'routes') cleanWord = 'route';
        if(cleanWord === 'valleys') cleanWord = 'valley';
        if(cleanWord === 'ghats') cleanWord = 'ghat';
        if(cleanWord === 'trails') cleanWord = 'trail';

        if (cleanWord && !fillerWords.includes(cleanWord) && isNaN(cleanWord)) searchKeywords.push(cleanWord);
    });

    return { extractedMaxMins, extractedMaxKm, searchKeywords };
}

function executeSearch() {
    document.body.classList.remove('card-open'); 
    const searchInput = document.getElementById('search-bar');
    const query = searchInput ? searchInput.value.trim() : '';
    
    document.body.classList.add('map-active');
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
    
    activeRouteLayers.forEach(l => map.removeLayer(l));
    activeRouteLayers = [];
    if (routingControl) {
        routingControl = null;
        currentRouteCoords = []; 
        document.querySelectorAll('.utility-toggle').forEach(cb => {
            if (cb.checked) { cb.checked = false; utilityLayers[cb.id].clearLayers(); }
        });
    }
    
    const locationCard = document.getElementById('location-card');
    if (locationCard) locationCard.style.display = 'none';

    // Reset previous-search UX: clear the count label.
    const prevCount = document.getElementById('result-count-label');
    if (prevCount) prevCount.classList.remove('visible');

    const smartQuery = parseConversationalQuery(query);
    const toggleDist = document.getElementById('toggle-distance');
    const toggleDur = document.getElementById('toggle-duration');
    const isDistActive = toggleDist && toggleDist.checked;
    const isDurActive = toggleDur && toggleDur.checked;

    const activeUtilities = [];
    document.querySelectorAll('.utility-toggle').forEach(cb => {
        if (cb.checked) activeUtilities.push(cb.getAttribute('data-query').toLowerCase());
    });
    
    getDocs(collection(db, "trails")).then(snapshot => {
        const data = snapshot.docs.map(doc => doc.data());

        const featureWords = ['ghat', 'coast', 'sunrise', 'sunset', 'forest', 'jungle', 'offroad', 'dirt', 'mountain', 'lake', 'waterfall', 'viewpoint', 'highway', 'chill', 'twisties', 'adventure', 'scenic', 'corners', 'dam', 'valley', 'route', 'trail'];
        const locationKeywords = smartQuery.searchKeywords.filter(kw => !featureWords.includes(kw));
        const isFeatureOnlySearch = smartQuery.searchKeywords.length > 0 && locationKeywords.length === 0;

        const aliasMap = {
            'bangalore': ['chikkaballapur', 'tumkur', 'magadi', 'hosur', 'anekal', 'doddaballapura', 'ramanagara', 'kanakapura', 'kalavara', 'bengaluru'],
            'bengaluru': ['chikkaballapur', 'tumkur', 'magadi', 'hosur', 'anekal', 'doddaballapura', 'ramanagara', 'kanakapura', 'kalavara', 'bangalore'],
            'pune': ['lonavala', 'bhor', 'satara', 'mahabaleshwar', 'pune', 'kalyan'],
            'mumbai': ['kalyan', 'igatpuri', 'mumbai', 'thane', 'lonavala'],
            'maharashtra': ['pune', 'kalyan', 'lonavala', 'satara', 'chiplun', 'shrivardhan', 'sawantwadi', 'igatpuri', 'bhor', 'ratnagiri', 'amravati', 'aurangabad', 'mahabaleshwar', 'samrad', 'mumbai', 'thane'],
            'karnataka': ['chikkaballapur', 'tumkur', 'magadi', 'hosur', 'anekal', 'doddaballapura', 'ramanagara', 'kanakapura', 'kalavara', 'bengaluru', 'bangalore', 'mudigere', 'udupi', 'sakleshpur', 'chikmagalur', 'kalasa', 'gundlupet', 'chamarajanagar', 'kundapura', 'kollur', 'sagara', 'dandeli', 'kumta', 'gokarna', 'hospet', 'madikeri', 'karwar'],
            'tamil': ['salem', 'pollachi', 'ooty', 'chennai', 'rameswaram', 'theni', 'palani', 'tirunelveli', 'coonoor', 'vaniyambadi', 'jolarpettai', 'chidambaram', 'dindigul', 'kodaikanal', 'devadanapatti', 'tenkasi', 'nagercoil'],
            'kerala': ['wayanad', 'munnar', 'kannur', 'vagamon', 'trivandrum', 'alappuzha', 'kottayam', 'pathanamthitta', 'thrissur', 'marayoor', 'varkala', 'idukki', 'palakkad', 'kasaragod', 'kozhikode', 'kumily'],
            'andhra': ['visakhapatnam', 'narsipatnam', 'jammalamadugu', 'kurnool', 'madanapalle', 'rajahmundry', 'sullurpeta', 'kakinada', 'macherla', 'nandikotkur'],
            'telangana': ['hyderabad', 'nalgonda', 'vikarabad', 'adilabad', 'mahabubnagar', 'mulugu', 'warangal'],
            'rajasthan': ['abu road', 'jaisalmer', 'kumbhalgarh', 'sambhar', 'sumerpur', 'nathdwara', 'barmer', 'kota', 'ranakpur'],
            'gujarat': ['bhuj', 'sasan gir', 'rapar', 'saputara', 'dwarka', 'idar', 'lakhpat', 'dasada', 'mandvi', 'kevadia'],
            'himachal': ['sonamarg', 'sarchu', 'pang', 'lukung', 'hunder', 'killar', 'kaza', 'shoja', 'manali', 'narkanda', 'rohru'],
            'uttarakhand': ['badrinath', 'pithoragarh', 'ukhimath', 'joshimath', 'dehradun'],
            'ladakh': ['leh', 'sonamarg', 'sarchu', 'pang', 'lukung', 'hunder'],
            'sikkim': ['gangtok', 'lachen', 'lachung'],
            'meghalaya': ['shillong', 'dawki', 'cherrapunji'],
            'assam': ['bokakhat', 'jorhat', 'guwahati'],
            'madhya': ['pipariya', 'dhar', 'hoshangabad', 'jabalpur', 'chhindwara', 'bhopal', 'indore'],
            'chhattisgarh': ['jagdalpur', 'dantewada', 'ambikapur', 'raipur'],
            'odisha': ['puri', 'kandhamal', 'jeypore', 'baripada', 'satapada', 'bhubaneswar'],
            'jharkhand': ['ranchi', 'latehar'],
            'bihar': ['bhabua', 'bettiah', 'patna'],
            'west': ['kurseong', 'kalimpong', 'bankura', 'kolkata', 'darjeeling']
        };

        let expandedLocKeywords = [...locationKeywords];
        locationKeywords.forEach(kw => {
            if (aliasMap[kw]) expandedLocKeywords.push(...aliasMap[kw]);
        });

        let matchedGems = data.filter(gem => {
            let isMatch = true;
            if (!gem.latitude || !gem.longitude) return false;
            
            const isExplicitTargetSearch = expandedLocKeywords.some(kw => {
                const regex = new RegExp(`\\b${kw}\\b`, 'i'); 
                return (gem.anchorCity && regex.test(gem.anchorCity)) ||
                       (gem.locationName && regex.test(gem.locationName)) ||
                       (gem.description && regex.test(gem.description));
            });

            const distKm = map.distance([userLat, userLng], [gem.latitude, gem.longitude]) / 1000;
            let currentMaxKm = 200; 
            
            if (smartQuery.extractedMaxKm) currentMaxKm = smartQuery.extractedMaxKm;
            else if (isDistActive) currentMaxKm = parseInt(document.getElementById('range-distance').value);
            
            const effectiveMaxKm = isFeatureOnlySearch ? 250 : currentMaxKm;
            if (!isExplicitTargetSearch && distKm > effectiveMaxKm) isMatch = false;

            if (isMatch) {
                if (!isExplicitTargetSearch) {
                    const estTime = gem.rideTimeMinutes || (distKm * 2.0);
                    if (smartQuery.extractedMaxMins) { if (estTime > smartQuery.extractedMaxMins) isMatch = false; }
                    else if (!isFeatureOnlySearch && isDurActive) { const maxDurHrs = parseFloat(document.getElementById('range-duration').value); if (estTime > (maxDurHrs * 60)) isMatch = false; }
                }
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
            let gemText = `${gem.vibeType || ''} ${gem.category || ''} ${gem.description || ''} ${gem.subCategory || ''}`.toLowerCase();
            
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
                const scoringKeywords = [...smartQuery.searchKeywords, ...expandedLocKeywords];
                
                scoringKeywords.forEach(kw => {
                    const regex = new RegExp(`\\b${kw}\\b`, 'i'); 
                    
                    if (gem.locationName && regex.test(gem.locationName)) personalScore += 10;
                    else if (gem.anchorCity && regex.test(gem.anchorCity)) personalScore += 10; 
                    else if (gem.description && regex.test(gem.description)) personalScore += 8;
                    else if (regex.test(gemText)) personalScore += 2;
                });
                if (personalScore <= 0) return null; 
            }
            return { ...gem, personalScore };
        }).filter(gem => gem !== null);
        
        matchedGems.sort((a, b) => b.personalScore - a.personalScore);

        if (matchedGems.length > 0) {
            let bounds = [];
            const isRadarMode = document.getElementById('toggle-radar')?.checked;

            if (isRadarMode) {
                currentMarkers.forEach(marker => map.removeLayer(marker));
                currentMarkers = [];
                if (heatLayer) map.removeLayer(heatLayer);
                
                const heatData = matchedGems.map((gem, index) => {
                    bounds.push([gem.latitude, gem.longitude]);
                    let intensity = (index < 3 && gem.personalScore >= 5) ? 1.0 : 0.6; 
                    return [parseFloat(gem.latitude), parseFloat(gem.longitude), intensity];
                });

                heatLayer = L.heatLayer(heatData, {
                    radius: 40, blur: 30,
                    gradient: { 0.4: '#002233', 0.6: '#0088aa', 0.8: '#00f0ff', 1.0: '#ffffff' }
                }).addTo(map);
            } else {
                if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
                
                matchedGems.forEach((gem, index) => {
                    gem.isTopMatch = (index < 3 && gem.personalScore >= 5);
                    
                    let pinColor = '#00f0ff'; let pinRadius = 5; let pinOpacity = 0.8; let pinWeight = 0; 
                    if (currentRiderProfile) {
                        if (gem.isTopMatch) { pinColor = '#D9B340'; pinRadius = 6.5; pinOpacity = 0.9; } 
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

            // Result count — fades in alongside the markers.
            const countLabel = document.getElementById('result-count-label');
            if (countLabel) {
                const n = matchedGems.length;
                countLabel.innerText = `${n} ${n === 1 ? 'place' : 'places'} found`;
                countLabel.classList.add('visible');
            }
        } else {
            // No matches on a real (non-empty) search: show a brief inline message
            // in the search bar, then restore what the rider typed.
            if (query !== '') {
                const searchBar = document.getElementById('search-bar');
                if (searchBar) {
                    const originalText = searchBar.value;
                    searchBar.style.color = "#555";
                    searchBar.value = "No trails found";
                    setTimeout(() => { searchBar.value = originalText; searchBar.style.color = "#fff"; }, 1500);
                }
            }
        }
    }).catch(err => console.error("Database Error:", err));
}

// --- ROUTING ---
function calculateRoute(destLat, destLng) {
    activeRouteLayers.forEach(l => map.removeLayer(l));
    activeRouteLayers = [];
    routingControl = null;
    // Try the backend proxy first; if it isn't available (e.g. the page is opened
    // without the server running), fall back to Mapbox directly so the route always draws.
    const proxyUrl = `/api/route?from=${userLng},${userLat}&to=${destLng},${destLat}`;
    const directUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${FALLBACK_MAPBOX_TOKEN}`;

    fetch(proxyUrl)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => (data && data.routes && data.routes.length) ? data : Promise.reject())
        .catch(() => fetch(directUrl).then(r => r.json()))
        .then(data => {
        if (!data.routes || data.routes.length === 0) return;
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        routingControl = L.polyline(coordinates, { color: '#00f0ff', weight: 5, opacity: 0.85 }).addTo(map);
        activeRouteLayers.push(routingControl);
        currentRouteCoords = coordinates.map(c => ({ lat: c[0], lng: c[1] }));

        const realDistanceKm = (route.distance / 1000).toFixed(1);
        const rawMinutes = route.duration / 60;
        
        let realisticMinutes = Math.round(rawMinutes);

        const hrs = Math.floor(realisticMinutes / 60);
        const mins = Math.floor(realisticMinutes % 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

        const distUI = document.getElementById('live-distance');
        const durUI = document.getElementById('live-duration');
        
        if (distUI) distUI.innerText = `${realDistanceKm} km`;
        if (durUI) durUI.innerText = timeStr;

        if (typeof SunCalc !== 'undefined') {
            const times = SunCalc.getTimes(new Date(), destLat, destLng);
            const formatTime = (date) => date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
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
// Cache of real elevation profiles, keyed by "lat,lng" so reopening the same
// card doesn't re-hit the Open-Elevation API.
const elevationCache = new Map();

// Deterministic noise profile, seeded by latitude — used as the skeleton
// placeholder while real data loads, and as the silent fallback if it fails.
function noiseElevationProfile(lat) {
    let seed = lat * 10000;
    const random = () => { let x = Math.sin(seed++) * 10000; return x - Math.floor(x); };

    const pts = [];
    let currentElev = 400;
    for (let i = 0; i < 15; i++) {
        currentElev += (random() * 100 - 40);
        pts.push(currentElev);
    }
    return pts;
}

// Builds the elevation chart markup from an array of elevation values.
// `loading` dims it slightly so the noise profile reads as a skeleton.
function elevationChartHTML(pts, dataKey, loading) {
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const step = 300 / (pts.length - 1);

    const points = pts.map((p, i) => {
        const x = i * step;
        const y = 40 - ((p - min) / (max - min || 1) * 40);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return `
        <div id="elevation-chart" data-key="${dataKey}" style="margin-bottom: 28px; opacity: ${loading ? 0.45 : 1}; transition: opacity 0.5s ease;">
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

// Used in the card template: renders the noise profile as the initial skeleton.
function generateTelemetrySVG(lat, dataKey) {
    return elevationChartHTML(noiseElevationProfile(lat), dataKey || '', true);
}

// Fetches a real elevation profile by sampling 12 points along the straight
// line from the rider to the trail, then swaps the skeleton for the real chart.
// Silent on failure/timeout: just un-dims the noise fallback. Caches by "lat,lng".
async function loadElevationProfile(gem) {
    const lat = gem.latitude, lng = gem.longitude;
    const key = `${lat},${lng}`;

    // Resolve the chart element only if it still belongs to this trail.
    const getChart = () => {
        const el = document.getElementById('elevation-chart');
        return (el && el.dataset.key === key) ? el : null;
    };
    // Reveal the noise fallback at full opacity (no real data available).
    const keepFallback = () => { const el = getChart(); if (el) el.style.opacity = '1'; };

    if (typeof lat !== 'number' || typeof lng !== 'number' ||
        typeof userLat !== 'number' || typeof userLng !== 'number') {
        return keepFallback();
    }

    // Serve from cache on repeat opens.
    if (elevationCache.has(key)) {
        const el = getChart();
        if (el) el.outerHTML = elevationChartHTML(elevationCache.get(key), key, false);
        return;
    }

    // 12 evenly spaced sample points along [user] -> [trail].
    const N = 12;
    const locations = [];
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        locations.push({
            latitude: userLat + (lat - userLat) * t,
            longitude: userLng + (lng - userLng) * t
        });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch('https://api.open-elevation.com/api/v1/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ locations }),
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const elevations = (data.results || [])
            .map(r => r && r.elevation)
            .filter(e => typeof e === 'number');
        if (elevations.length < 2) throw new Error('insufficient elevation data');

        elevationCache.set(key, elevations);

        const el = getChart();
        if (el) el.outerHTML = elevationChartHTML(elevations, key, false);
    } catch (err) {
        clearTimeout(timer);
        keepFallback(); // silent — keep the noise-based fallback
    }
}

// --- LOCATION CARD UI ---
// Pull real ground-level photos of a trail from Wikimedia Commons using a
// geosearch around the trail's coordinates, then inject them into the card's
// carousel. Falls back to a "Visual Data Pending" placeholder if nothing nearby.
async function loadTrailPhotos(gem) {
    const lat = gem.latitude;
    const lng = gem.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    // Resolve the carousel element and confirm it still belongs to this trail
    // (the user may have opened a different card before the fetch resolves).
    const getCarousel = () => {
        const el = document.getElementById('auto-photo-carousel');
        if (!el) return null;
        if (el.dataset.loc !== (gem.locationName || '')) return null;
        return el;
    };

    const imgStyle = 'width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05);';
    const placeholder = '<div style="color: #444; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 16px 0; width: 100%; text-align: center;">Visual Data Pending</div>';

    // generator=geosearch returns File: pages within radius (metres); imageinfo
    // gives us a 400px-wide thumbnail URL for each. origin=* enables anon CORS.
    const endpoint = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*'
        + '&generator=geosearch&ggsnamespace=6&ggsprimary=all&ggsradius=50000&ggslimit=30'
        + `&ggscoord=${lat}|${lng}`
        + '&prop=imageinfo&iiprop=url&iiurlwidth=400';

    try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const pages = (data.query && data.query.pages) ? Object.values(data.query.pages) : [];
        const urls = pages
            .sort((a, b) => (a.index || 0) - (b.index || 0)) // preserve nearest-first order
            .map(p => p.imageinfo && p.imageinfo[0] && (p.imageinfo[0].thumburl || p.imageinfo[0].url))
            .filter(u => u && /\.(jpe?g|png|webp)$/i.test(u.split('?')[0])) // photos only, skip svg/pdf/audio
            .slice(0, 6);

        const carousel = getCarousel();
        if (!carousel) return; // card closed or switched — nothing to update

        if (urls.length === 0) {
            carousel.innerHTML = placeholder;
            return;
        }

        carousel.innerHTML = urls
            .map(u => `<img src="${u}" loading="lazy" style="${imgStyle}">`)
            .join('');
    } catch (err) {
        console.warn('Wikimedia photo lookup failed:', err);
        const carousel = getCarousel();
        if (carousel) carousel.innerHTML = placeholder;
    }
}

function showLocationCard(gem) {
    const card = document.getElementById('location-card');
    if (!card) return;
    
    let carouselHTML = '';
    if (gem.images && gem.images.length > 0) {
        const imageTags = gem.images.map(imgUrl => `<img src="${imgUrl}" style="width: 140px; height: 90px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05);">`).join('');
        carouselHTML = `<div class="photo-carousel" style="display: flex; gap: 12px; overflow-x: auto; margin-bottom: 24px; padding-bottom: 4px;">${imageTags}</div>`;
    } else {
        // No curated images for this trail — load real photos of the place from
        // Wikimedia Commons (geosearch by coordinates). Filled in asynchronously below.
        carouselHTML = `
        <div id="auto-photo-carousel" class="photo-carousel" data-loc="${(gem.locationName || '').replace(/"/g, '&quot;')}" style="display: flex; gap: 12px; overflow-x: auto; margin-bottom: 24px; padding-bottom: 4px;">
            <div style="color: #444; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 16px 0; width: 100%; text-align: center;">Loading views…</div>
        </div>`;
    }

    let tempTime = 'Calc...';
    if (gem.rideTimeMinutes) {
        const h = Math.floor(gem.rideTimeMinutes / 60);
        const m = gem.rideTimeMinutes % 60;
        tempTime = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

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

    let solarHTML = '';
    if (typeof SunCalc !== 'undefined') {
        const rawDistKm = map.distance([userLat, userLng], [gem.latitude, gem.longitude]) / 1000;
        const rideMins = gem.rideTimeMinutes || (rawDistKm * 2.0);
        
        const times = SunCalc.getTimes(new Date(), gem.latitude, gem.longitude);
        
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
    let cafeName = '';
    
    if (typeof gem.cafe === 'string' && gem.cafe.trim() !== '' && gem.cafe !== 'true') {
        cafeName = gem.cafe;
    } else if (typeof gem.breakfastStop === 'string' && gem.breakfastStop.trim() !== '' && gem.breakfastStop !== 'true') {
        cafeName = gem.breakfastStop;
    } else if (gem.cafe || gem.breakfastStop) {
        cafeName = 'Cafe / Rest Stop';
    }

    if (cafeName !== '') {
        cafeHTML = `
            <div style="margin-bottom: 32px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px; font-weight: 800;">Pit Stop</div>
                <div style="font-size: 14px; font-weight: 600; color: #d0d0d0; display: flex; align-items: center; gap: 8px;">☕ ${cafeName}</div>
            </div>
        `;
    }

    let topMatchHTML = '';
    if (currentRiderProfile && gem.isTopMatch) {
        topMatchHTML = `<div style="background: rgba(217, 179, 64, 0.1); color: #D9B340; border: 1px solid rgba(217, 179, 64, 0.4); font-size: 9px; font-weight: 900; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">★ Top Match</div>`;
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
            <div style="display: flex; align-items: center; gap: 8px;">
                <button id="share-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: #555; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; flex-shrink: 0; display: flex; justify-content: center; align-items: center; transition: all 0.2s;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
                <button id="fav-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: ${initialHeartColor}; filter: ${initialGlow}; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; flex-shrink: 0; display: flex; justify-content: center; align-items: center; font-size: 18px;">♥</button>
                <button id="close-card-btn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: #555; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; flex-shrink: 0; display: flex; justify-content: center; align-items: center; transition: all 0.2s;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        </div>
        
        ${distDurHTML}
        ${carouselHTML}
        ${generateTelemetrySVG(gem.latitude, gem.latitude + ',' + gem.longitude)}
        
        ${solarHTML} 
        
        <div style="margin-bottom: 28px;">
            <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: 800;">Intel</div>
            <p style="font-size: 14px; color: #a0a0a5; margin: 0; width: 100%; line-height: 1.6; font-weight: 400;">${gem.description}</p>
        </div>
        
        ${cafeHTML}
        
        <a href="https://www.google.com/maps/dir/?api=1&destination=${gem.latitude},${gem.longitude}" target="_blank" id="start-route-btn" style="display: block; width: 100%; padding: 18px; border-radius: 12px; font-weight: 800; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; text-align: center; text-decoration: none; cursor: pointer; background: #00f0ff; color: #000;">START ROUTE</a>
    `;
    card.style.display = 'flex';

    document.body.classList.add('card-open');

    // Kick off real-photo loading for trails without curated images.
    if (!(gem.images && gem.images.length > 0)) {
        loadTrailPhotos(gem);
    }

    // Replace the skeleton elevation chart with real Open-Elevation data.
    loadElevationProfile(gem);

    const closeBtn = document.getElementById('close-card-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            card.style.display = 'none';
            document.body.classList.remove('card-open');
            if (routingControl) { map.removeLayer(routingControl); routingControl = null; }
        });
    }

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const shareData = {
                title: `Marga: ${gem.locationName}`,
                text: `Check out the ${gem.locationName} trail on Marga!\n\n${gem.description}\n\n`,
                url: window.location.href 
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                    
                    const originalHtml = shareBtn.innerHTML;
                    shareBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    shareBtn.style.borderColor = '#00f0ff';
                    shareBtn.style.background = 'rgba(0, 240, 255, 0.1)';
                    
                    setTimeout(() => {
                        shareBtn.innerHTML = originalHtml;
                        shareBtn.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        shareBtn.style.background = 'rgba(255, 255, 255, 0.05)';
                    }, 2000);
                }
            } catch (err) {
                console.log('Share action cancelled or failed.', err);
            }
        });
    }

    const startRouteBtn = document.getElementById('start-route-btn');
    if (startRouteBtn) {
        startRouteBtn.addEventListener('click', (e) => {
            if (!auth.currentUser) {
                e.preventDefault(); 
                
                card.style.display = 'none'; 
                document.body.classList.remove('card-open');
                
                if (window.launchApp) window.launchApp('join');
            }
        });
    }
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
        const label = e.target.closest('label');

        if (!e.target.checked) {
            utilityLayers[toggleId].clearLayers();
            if (label) label.style.opacity = '';
            return;
        }

        // Show loading pulse on the icon
        if (label) label.style.opacity = '0.4';

        // Cap the query to a ~30km box around the map center so Overpass doesn't reject it
        const center = map.getCenter();
        const delta = 0.27; // ~30km in degrees
        const bbox = `${center.lat - delta},${center.lng - delta},${center.lat + delta},${center.lng + delta}`;
        let query = ''; let iconSVG = '';

        if (toggleId === 'toggle-petrol') { query = `node["amenity"="fuel"](${bbox});`; iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"></line><line x1="4" y1="9" x2="14" y2="9"></line><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg>`; }
        else if (toggleId === 'toggle-food') { query = `node["amenity"~"restaurant|cafe|fast_food"](${bbox});`; iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4V2"></path><line x1="7" y1="2" x2="7" y2="22"></line><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>`; }
        else if (toggleId === 'toggle-emergency') { query = `node["amenity"~"hospital|clinic|police"](${bbox});`; iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`; }

        fetch(`https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(`[out:json];${query}out;`)}`)
            .then(res => res.json())
            .then(data => {
                if (label) label.style.opacity = '';
                if (!data.elements || data.elements.length === 0) return;

                let filteredElements = data.elements;
                if (currentRouteCoords.length > 0) {
                    filteredElements = data.elements.filter(el => {
                        if (!el.lat || !el.lon) return false;
                        for (let i = 0; i < currentRouteCoords.length; i += 5) {
                            if (map.distance([el.lat, el.lon], [currentRouteCoords[i].lat, currentRouteCoords[i].lng]) < 5000) return true;
                        } return false;
                    });
                    // If route filter returns nothing, fall back to all results in view
                    if (filteredElements.length === 0) filteredElements = data.elements;
                }

                filteredElements
                    .sort((a, b) => map.distance([userLat, userLng], [a.lat, a.lon]) - map.distance([userLat, userLng], [b.lat, b.lon]))
                    .slice(0, 20)
                    .forEach(el => {
                        if (el.lat && el.lon) {
                            const customIcon = L.divIcon({ className: 'minimal-poi-icon', html: `<div style="background: #1a1a1a; border: 1px solid #333; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.6);">${iconSVG}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
                            const distToUser = (map.distance([userLat, userLng], [el.lat, el.lon]) / 1000).toFixed(1);
                            L.marker([el.lat, el.lon], { icon: customIcon }).addTo(utilityLayers[toggleId]).bindPopup(`<strong style="color: #ffffff;">${el.tags?.name || 'Unknown'}</strong><br><span style="color: #aaaaaa; font-size: 11px;">${distToUser} km from you</span>`);
                        }
                    });
            })
            .catch(err => {
                if (label) label.style.opacity = '';
                console.log('Live Map API Error:', err);
            });
    });
});

const searchBarInput = document.getElementById('search-bar');
if (searchBarInput) searchBarInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') { e.preventDefault(); executeSearch(); } });

const radarToggle = document.getElementById('toggle-radar');
if (radarToggle) radarToggle.addEventListener('change', () => executeSearch());

window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.add('hidden');
    }, 800);
});

setTimeout(() => {
    const loader = document.getElementById('global-loader');
    if (loader && !loader.classList.contains('hidden')) {
        loader.classList.add('hidden');
    }
}, 3000);