import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const allTrails = [
    // ==========================================
    // --- BENGALURU & MAHARASHTRA ORIGINALS (10)
    // ==========================================
    {
        locationName: "Nandi Hills",
        anchorCity: "Chikkaballapur",
        category: "Ghat",
        vibeType: "Twisties",
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
        vibeType: "Twisties",
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
        vibeType: "Chill",
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
        vibeType: "OffRoad",
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
        vibeType: "OffRoad",
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
        vibeType: "Chill",
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
        vibeType: "OffRoad",
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
        vibeType: "Chill",
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
        vibeType: "OffRoad",
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
        vibeType: "Chill",
        description: "Quiet village roads leading to the base of the famous night-trekking peak. Great early morning fog.",
        latitude: 13.4182,
        longitude: 77.6833,
        petrolPump: false,
        images: []
    },

    // ==========================================
    // --- KARNATAKA EXPANSION (20)
    // ==========================================
    {
        locationName: "Charmadi Ghat Twisties",
        anchorCity: "Mudigere",
        category: "Mountain",
        vibeType: "Twisties",
        description: "One of the most technically demanding and beautiful ghats in the Western Ghats. Endless hairpin bends, deep valleys, and heavy fog in the mornings.",
        latitude: 13.0610,
        longitude: 75.4338,
        petrolPump: false,
        cafe: "Charmadi Ghat Viewpoint Tea Stall",
        images: []
    },
    {
        locationName: "Agumbe Rainforest Pass",
        anchorCity: "Udupi",
        category: "Mountain",
        vibeType: "Twisties",
        description: "Known as the Cherrapunji of the South. 14 aggressive hairpin bends descending through dense, dark rainforest canopies.",
        latitude: 13.5042,
        longitude: 75.0886,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Bisle Ghat Reserve",
        anchorCity: "Sakleshpur",
        category: "Forest",
        vibeType: "OffRoad",
        description: "An absolute hardcore ADV route. Broken tarmac, deep ruts, and elephant corridors. Not recommended for street bikes.",
        latitude: 12.7533,
        longitude: 75.6888,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Mullayanagiri Peak",
        anchorCity: "Chikmagalur",
        category: "Mountain",
        vibeType: "Twisties",
        description: "Ride to the highest peak in Karnataka. The road is extremely narrow and winding with steep drops. The wind at the top is incredible.",
        latitude: 13.3909,
        longitude: 75.7214,
        petrolPump: false,
        breakfastStop: "Siri Cafe",
        images: []
    },
    {
        locationName: "Kudremukh National Park",
        anchorCity: "Kalasa",
        category: "Scenic",
        vibeType: "Chill",
        description: "Rolling green hills that look like a Windows wallpaper. Strict time limits for crossing the forest checkpoint, so plan accordingly.",
        latitude: 13.2562,
        longitude: 75.2536,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Bandipur Forest Highway",
        anchorCity: "Gundlupet",
        category: "Forest",
        vibeType: "Highway",
        description: "Smooth, straight tarmac cutting right through a tiger reserve. Keep speeds low and watch for deer and elephants crossing.",
        latitude: 11.6669,
        longitude: 76.6293,
        petrolPump: false,
        images: []
    },
    {
        locationName: "BR Hills Canopy Ride",
        anchorCity: "Chamarajanagar",
        category: "Forest",
        vibeType: "Twisties",
        description: "A secluded hill range linking the Eastern and Western Ghats. Great corners and a high probability of spotting wildlife.",
        latitude: 11.9961,
        longitude: 77.1388,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Maravanthe Beach Highway",
        anchorCity: "Kundapura",
        category: "Coastal",
        vibeType: "Highway",
        description: "One of the only roads in India where the ocean is on one side and a river is on the other. Incredible sunset cruising.",
        latitude: 13.7144,
        longitude: 74.6366,
        petrolPump: true,
        cafe: "Turtle Bay Shack",
        images: []
    },
    {
        locationName: "Kodachadri Base Trail",
        anchorCity: "Kollur",
        category: "Mountain",
        vibeType: "OffRoad",
        description: "A punishing dirt and rock trail leading up to the Kodachadri peak base. Bring a proper ADV or off-road tires.",
        latitude: 13.8617,
        longitude: 74.8710,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Kemmangundi Z Point",
        anchorCity: "Chikmagalur",
        category: "Scenic",
        vibeType: "Chill",
        description: "Beautiful estate roads cutting through historic coffee plantations. Some patches of bad road, but the valleys are worth it.",
        latitude: 13.5463,
        longitude: 75.7584,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Jog Falls Valley Route",
        anchorCity: "Sagara",
        category: "Scenic",
        vibeType: "Chill",
        description: "Smooth approach roads leading to the second-highest plunge waterfall in India. Best ridden during or just after the monsoons.",
        latitude: 14.2290,
        longitude: 74.8142,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Dandeli Jungle Core",
        anchorCity: "Dandeli",
        category: "Forest",
        vibeType: "OffRoad",
        description: "Dense, humid deciduous forest trails. Expect mud, gravel, and canopy shade. Perfect for finding isolated river banks.",
        latitude: 15.2444,
        longitude: 74.6190,
        petrolPump: false,
        breakfastStop: "Bison River Resort Canteen",
        images: []
    },
    {
        locationName: "Yana Caves Forest Approach",
        anchorCity: "Kumta",
        category: "Trail",
        vibeType: "Chill",
        description: "A highly scenic, narrow paved road cutting through deep forest leading to massive black karst rock formations.",
        latitude: 14.5888,
        longitude: 74.5615,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Gokarna Coastal Loop",
        anchorCity: "Gokarna",
        category: "Coastal",
        vibeType: "Chill",
        description: "Cliffside ocean views connecting Om Beach and Kudle Beach. Narrow roads, very relaxed vibe. Stop for seafood.",
        latitude: 14.5398,
        longitude: 74.3168,
        petrolPump: true,
        cafe: "Namaste Cafe",
        images: []
    },
    {
        locationName: "Hampi Ruins Circuit",
        anchorCity: "Hospet",
        category: "Scenic",
        vibeType: "Chill",
        description: "Ride through an ancient, alien landscape of massive boulders and 14th-century temple ruins. Best at sunrise to beat the heat.",
        latitude: 15.3350,
        longitude: 76.4600,
        petrolPump: true,
        breakfastStop: "Mango Tree Restaurant",
        images: []
    },
    {
        locationName: "Sakleshpur Estate Trails",
        anchorCity: "Sakleshpur",
        category: "Trail",
        vibeType: "OffRoad",
        description: "Endless interconnecting dirt roads navigating through private spice and coffee estates. Get lost and find your way back.",
        latitude: 12.9716,
        longitude: 75.7866,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Madikeri Fog Pass",
        anchorCity: "Madikeri",
        category: "Mountain",
        vibeType: "Twisties",
        description: "The classic Coorg experience. Super smooth sweeping corners on the highway wrapped in cold morning fog.",
        latitude: 12.4244,
        longitude: 75.7382,
        petrolPump: true,
        cafe: "Ainmane Cafe",
        images: []
    },
    {
        locationName: "Mandalpatti 4x4 Trail",
        anchorCity: "Madikeri",
        category: "Mountain",
        vibeType: "OffRoad",
        description: "Steep, rocky, and unforgiving. Usually dominated by local 4x4 Jeeps. A proper test of clutch control and suspension.",
        latitude: 12.4988,
        longitude: 75.7179,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Honnemardu Backwaters",
        anchorCity: "Sagara",
        category: "Lake",
        vibeType: "Chill",
        description: "A beautifully isolated road leading right to the edge of the Sharavathi backwaters. Park the bike and take a coracle ride.",
        latitude: 14.1833,
        longitude: 74.8667,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Karwar Naval Highway",
        anchorCity: "Karwar",
        category: "Coastal",
        vibeType: "Highway",
        description: "Fast, flat highway bridging the Kali river and the Arabian sea. One of the cleanest stretches of coastal tarmac in the state.",
        latitude: 14.8050,
        longitude: 74.1350,
        petrolPump: true,
        images: []
    },

    // ==========================================
    // --- TAMIL NADU EXPANSION (20)
    // ==========================================
    {
        locationName: "Kolli Hills 70 Hairpins",
        anchorCity: "Salem",
        category: "Mountain",
        vibeType: "Twisties",
        description: "The holy grail of South Indian motorcycling. Exactly 70 continuous hairpin bends climbing sharply up the mountain.",
        latitude: 11.2666,
        longitude: 78.3333,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Valparai Forest Ghat",
        anchorCity: "Pollachi",
        category: "Forest",
        vibeType: "Twisties",
        description: "40 sweeping hairpins cutting through lush tea estates and the Anamalai Tiger Reserve.",
        latitude: 10.3283,
        longitude: 76.9536,
        petrolPump: true,
        cafe: "Aliyar Dam Tea Stall",
        images: []
    },
    {
        locationName: "Kalahatti Ghat (Masinagudi)",
        anchorCity: "Ooty",
        category: "Mountain",
        vibeType: "Twisties",
        description: "One of the steepest, most dangerous descents in India. 36 extreme hairpins dropping from Ooty.",
        latitude: 11.5126,
        longitude: 76.6575,
        petrolPump: false,
        images: []
    },
    {
        locationName: "East Coast Road (ECR)",
        anchorCity: "Chennai",
        category: "Coastal",
        vibeType: "Highway",
        description: "A flawless, straight expanse of tarmac running directly parallel to the Bay of Bengal.",
        latitude: 12.6207,
        longitude: 80.1945,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Yercaud Loop Road",
        anchorCity: "Salem",
        category: "Mountain",
        vibeType: "Chill",
        description: "A scenic 32km loop road winding through peaceful coffee plantations and bamboo forests.",
        latitude: 11.7803,
        longitude: 78.2057,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Dhanushkodi Land's End",
        anchorCity: "Rameswaram",
        category: "Coastal",
        vibeType: "Highway",
        description: "Ride to the edge of India. A surreal strip of highway with the Indian Ocean on both sides.",
        latitude: 9.1764,
        longitude: 79.3512,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Meghamalai (High Wavy Mountains)",
        anchorCity: "Theni",
        category: "Mountain",
        vibeType: "OffRoad",
        description: "A remote, largely unpaved ascent into the clouds leading to untouched tea estates.",
        latitude: 9.7118,
        longitude: 77.4045,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Kodaikanal Palani Approach",
        anchorCity: "Palani",
        category: "Mountain",
        vibeType: "Twisties",
        description: "The less-traveled back route into Kodaikanal. Steep climbs and spectacular valley views.",
        latitude: 10.2381,
        longitude: 77.4891,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Manjolai Estate Trails",
        anchorCity: "Tirunelveli",
        category: "Forest",
        vibeType: "OffRoad",
        description: "Deep in the Kalakkad Mundanthurai Tiger Reserve. Restricted entry, broken dirt roads.",
        latitude: 8.6186,
        longitude: 77.4116,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Kotagiri Tea Estates",
        anchorCity: "Coonoor",
        category: "Mountain",
        vibeType: "Chill",
        description: "The quiet alternative to Ooty. Sweeping, well-paved curves rolling through green tea leaves.",
        latitude: 11.4253,
        longitude: 76.8827,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Javadi Hills",
        anchorCity: "Vaniyambadi",
        category: "Mountain",
        vibeType: "Chill",
        description: "A lesser-known, highly peaceful mountain range near Yelagiri. Ideal for a slow Sunday cruise.",
        latitude: 12.5855,
        longitude: 78.8351,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Yelagiri 14 Hairpins",
        anchorCity: "Jolarpettai",
        category: "Mountain",
        vibeType: "Twisties",
        description: "A short, immaculately paved ghat road with exactly 14 numbered hairpin bends.",
        latitude: 12.5796,
        longitude: 78.6385,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Pichavaram Mangrove Highway",
        anchorCity: "Chidambaram",
        category: "Coastal",
        vibeType: "Chill",
        description: "Flat, rural coastal roads leading to the second-largest mangrove forest in the world.",
        latitude: 11.4294,
        longitude: 79.7925,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Sirumalai Hills",
        anchorCity: "Dindigul",
        category: "Mountain",
        vibeType: "Twisties",
        description: "A tight, aggressively cornered road featuring 18 hairpins through banana plantations.",
        latitude: 10.2017,
        longitude: 77.9942,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Poombarai Village Road",
        anchorCity: "Kodaikanal",
        category: "Scenic",
        vibeType: "Chill",
        description: "A breathtaking road extending past Kodaikanal into terraced farming valleys.",
        latitude: 10.2520,
        longitude: 77.4100,
        petrolPump: false,
        cafe: "Passiflora Cafe",
        images: []
    },
    {
        locationName: "Mukurthi National Park Outer",
        anchorCity: "Ooty",
        category: "Forest",
        vibeType: "OffRoad",
        description: "High altitude grasslands bordering Kerala. Roads often destroyed by monsoon rains.",
        latitude: 11.4162,
        longitude: 76.5367,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Thalaiyar Viewpoint Road",
        anchorCity: "Devadanapatti",
        category: "Mountain",
        vibeType: "Chill",
        description: "A gorgeous, cliff-hugging road offering a direct view of the massive Rat Tail Falls.",
        latitude: 10.2447,
        longitude: 77.5683,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Avalanche Lake Road",
        anchorCity: "Ooty",
        category: "Lake",
        vibeType: "Chill",
        description: "A pristine, winding forest road leading to a high-altitude lake. Often shrouded in mist.",
        latitude: 11.3146,
        longitude: 76.5772,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Courtallam Falls Approach",
        anchorCity: "Tenkasi",
        category: "Scenic",
        vibeType: "Highway",
        description: "Canopied state highways leading into the 'Spa of the South'.",
        latitude: 8.9329,
        longitude: 77.2721,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Kanyakumari Coastal Highway",
        anchorCity: "Nagercoil",
        category: "Coastal",
        vibeType: "Highway",
        description: "Ride down the absolute southern tip of the Indian subcontinent. Strong crosswinds and open ocean.",
        latitude: 8.0883,
        longitude: 77.5385,
        petrolPump: true,
        images: []
    },

    // ==========================================
    // --- KERALA EXPANSION (20)
    // ==========================================
    {
        locationName: "Thamarassery Churam",
        anchorCity: "Wayanad",
        category: "Mountain",
        vibeType: "Twisties",
        description: "The gateway to Wayanad. 9 sharp, intense hairpins climbing through deep fog.",
        latitude: 11.4988,
        longitude: 76.0125,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Munnar Tea Estate Curves",
        anchorCity: "Munnar",
        category: "Mountain",
        vibeType: "Twisties",
        description: "Immaculate, sweeping black tarmac cutting through blindingly green tea estates.",
        latitude: 10.0889,
        longitude: 77.0595,
        petrolPump: true,
        cafe: "Harrison Malayalam Tea Point",
        images: []
    },
    {
        locationName: "Muzhappilangad Drive-in Beach",
        anchorCity: "Kannur",
        category: "Coastal",
        vibeType: "Chill",
        description: "The longest drive-in beach in Asia. 4 kilometers of hard-packed sand to ride right on the shoreline.",
        latitude: 11.7923,
        longitude: 75.4526,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Vagamon Pine Forest Route",
        anchorCity: "Vagamon",
        category: "Forest",
        vibeType: "Chill",
        description: "A misty road winding through towering pine forests and endless rolling meadows.",
        latitude: 9.6841,
        longitude: 76.9034,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Ponmudi 22 Hairpins",
        anchorCity: "Trivandrum",
        category: "Mountain",
        vibeType: "Twisties",
        description: "A beautifully paved, fast-paced ascent featuring exactly 22 hairpins.",
        latitude: 8.7599,
        longitude: 77.1169,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Kuttanad Backwater Strip",
        anchorCity: "Alappuzha",
        category: "Scenic",
        vibeType: "Chill",
        description: "Ride through the rice bowl of Kerala. A perfectly flat ribbon of road with water channels on both sides.",
        latitude: 9.4312,
        longitude: 76.3804,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Illikkal Kallu Summit",
        anchorCity: "Kottayam",
        category: "Mountain",
        vibeType: "OffRoad",
        description: "An incredibly steep, narrow, and broken path leading up to a massive rock formation.",
        latitude: 9.7348,
        longitude: 76.8188,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Gavi Deep Forest Trail",
        anchorCity: "Pathanamthitta",
        category: "Forest",
        vibeType: "OffRoad",
        description: "A heavily restricted eco-tourism trail. Mud, gravel, and high chances of spotting wild elephants.",
        latitude: 9.4357,
        longitude: 77.1648,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Athirappilly Jungle Highway",
        anchorCity: "Thrissur",
        category: "Forest",
        vibeType: "Highway",
        description: "A shaded stretch of road cutting through the Sholayar Reserve Forest leading to a famous waterfall.",
        latitude: 10.2851,
        longitude: 76.5694,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Marayoor Sandalwood Forest",
        anchorCity: "Marayoor",
        category: "Forest",
        vibeType: "Chill",
        description: "A highly aromatic, winding road passing straight through the natural sandalwood forest.",
        latitude: 10.2741,
        longitude: 77.1593,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Varkala Cliff Road",
        anchorCity: "Varkala",
        category: "Coastal",
        vibeType: "Chill",
        description: "A relaxed, low-speed road tracing the top of the famous red laterite cliffs.",
        latitude: 8.7378,
        longitude: 76.7163,
        petrolPump: true,
        cafe: "Darjeeling Cafe",
        images: []
    },
    {
        locationName: "Idukki Arch Dam Approach",
        anchorCity: "Idukki",
        category: "Mountain",
        vibeType: "Twisties",
        description: "Wide, sweeping corners leading to one of the highest arch dams in Asia.",
        latitude: 9.8433,
        longitude: 76.9744,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Nelliyampathy Ghats",
        anchorCity: "Palakkad",
        category: "Mountain",
        vibeType: "Twisties",
        description: "A gem featuring 10 hairpin bends. Ascends quickly from hot plains into cool orange estates.",
        latitude: 10.5361,
        longitude: 76.6845,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Bekal Fort Coastal Drive",
        anchorCity: "Kasaragod",
        category: "Coastal",
        vibeType: "Highway",
        description: "A clean, straight stretch of highway right along the northern Kerala coastline.",
        latitude: 12.3948,
        longitude: 75.0347,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Parambikulam Reserve Road",
        anchorCity: "Palakkad",
        category: "Forest",
        vibeType: "OffRoad",
        description: "A rugged dirt and broken-tarmac track leading into a tiger reserve. True off-grid riding.",
        latitude: 10.3927,
        longitude: 76.7758,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Chinnar Wildlife Pass",
        anchorCity: "Munnar",
        category: "Forest",
        vibeType: "Highway",
        description: "The road dropping down from Munnar into the dry plains. Fast corners and incredible views.",
        latitude: 10.3012,
        longitude: 77.2625,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Silent Valley Buffer Zone",
        anchorCity: "Palakkad",
        category: "Forest",
        vibeType: "OffRoad",
        description: "Remote, unpaved logging trails skirting the edge of pristine tropical evergreen forest.",
        latitude: 11.1354,
        longitude: 76.4326,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Kappil Beach Highway",
        anchorCity: "Kozhikode",
        category: "Coastal",
        vibeType: "Highway",
        description: "A fast, scenic coastal strip where the Arabian Sea crashes against the rocks next to the tarmac.",
        latitude: 11.5167,
        longitude: 75.6667,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Kumily Apple Orchard Route",
        anchorCity: "Kumily",
        category: "Mountain",
        vibeType: "Chill",
        description: "A high-altitude road riding past the Periyar tiger reserve into small spice and fruit orchards.",
        latitude: 9.6053,
        longitude: 77.1659,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Agasthyakoodam Base Trail",
        anchorCity: "Trivandrum",
        category: "Forest",
        vibeType: "OffRoad",
        description: "A muddy forest track cutting into the Neyyar Wildlife Sanctuary. For ADVs with good ground clearance.",
        latitude: 8.6186,
        longitude: 77.2458,
        petrolPump: false,
        images: []
    },

    // ==========================================
    // --- NEW: ANDHRA PRADESH & TELANGANA (20)
    // ==========================================
    {
        locationName: "Araku Valley Hairpins",
        anchorCity: "Visakhapatnam",
        category: "Mountain",
        vibeType: "Twisties",
        description: "A stunning ascent through the Eastern Ghats. Smooth tarmac, endless coffee plantations, and spectacular sweeping curves.",
        latitude: 18.3333,
        longitude: 82.8667,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Lambasingi Fog Route",
        anchorCity: "Narsipatnam",
        category: "Mountain",
        vibeType: "Chill",
        description: "Known as the 'Kashmir of Andhra'. The only place in South India that occasionally sees freezing temperatures. Phenomenal morning fog.",
        latitude: 17.8167,
        longitude: 82.4900,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Srisailam Tiger Reserve Highway",
        anchorCity: "Hyderabad",
        category: "Forest",
        vibeType: "Highway",
        description: "A flawless ribbon of highway cutting directly through the dense Nallamala forest. Keep speeds in check for wildlife crossings.",
        latitude: 16.0718,
        longitude: 78.8666,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Gandikota Grand Canyon",
        anchorCity: "Jammalamadugu",
        category: "Scenic",
        vibeType: "OffRoad",
        description: "Ride right up to the edge of India's Grand Canyon. The final approach involves rocky dirt trails leading to the sheer gorge drop-off.",
        latitude: 14.8127,
        longitude: 78.2863,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Belum Caves Desert Run",
        anchorCity: "Kurnool",
        category: "Scenic",
        vibeType: "Highway",
        description: "Long, flat, and hot stretches of arid highway leading to the second-longest cave system in the Indian subcontinent.",
        latitude: 15.1023,
        longitude: 78.1115,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Horsley Hills Ghats",
        anchorCity: "Madanapalle",
        category: "Mountain",
        vibeType: "Twisties",
        description: "A short, sharp climb into a high-altitude hill station. The tree-lined canopy over the hairpins is a rider's dream.",
        latitude: 13.6500,
        longitude: 78.4000,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Maredumilli Forest Trail",
        anchorCity: "Rajahmundry",
        category: "Forest",
        vibeType: "Chill",
        description: "Riding through giant bamboo clusters and dense tropical canopy. Stop by the roadside for the famous bamboo chicken.",
        latitude: 17.6045,
        longitude: 81.7042,
        petrolPump: false,
        cafe: "Raju Bamboo Chicken",
        images: []
    },
    {
        locationName: "Vizag-Bheemili Coastal Road",
        anchorCity: "Visakhapatnam",
        category: "Coastal",
        vibeType: "Highway",
        description: "A gorgeous 30km unbroken stretch of coastal highway with the Eastern Ghats on your left and the Bay of Bengal on your right.",
        latitude: 17.8860,
        longitude: 83.4475,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Nagarjuna Sagar Dam Road",
        anchorCity: "Nalgonda",
        category: "Lake",
        vibeType: "Highway",
        description: "Fast-paced highway cruising leading to the largest masonry dam in the world. Incredible water views during monsoon season.",
        latitude: 16.5750,
        longitude: 79.3142,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Ananthagiri Hills",
        anchorCity: "Vikarabad",
        category: "Forest",
        vibeType: "Twisties",
        description: "The primary weekend getaway for Hyderabad riders. Tight forest corners and excellent early morning weather.",
        latitude: 17.3105,
        longitude: 77.8631,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Kuntala Waterfall Approach",
        anchorCity: "Adilabad",
        category: "Scenic",
        vibeType: "Chill",
        description: "A quiet, highly scenic state highway riding deep into the Sahyadri mountain ranges toward Telangana's highest waterfall.",
        latitude: 19.3090,
        longitude: 78.4830,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Amarabad Tiger Reserve",
        anchorCity: "Mahabubnagar",
        category: "Forest",
        vibeType: "OffRoad",
        description: "Raw, untouched terrain. While the main highway is paved, the off-shoot tribal trails are rocky, dusty, and brilliant for ADV riding.",
        latitude: 16.3813,
        longitude: 78.8504,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Pulicat Lake Strip",
        anchorCity: "Sullurpeta",
        category: "Coastal",
        vibeType: "Highway",
        description: "A surreal, flat ride next to the second-largest brackish water lagoon in India. Watch thousands of flamingos during the migratory season.",
        latitude: 13.6706,
        longitude: 80.1872,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Borra Caves Mountain Pass",
        anchorCity: "Visakhapatnam",
        category: "Mountain",
        vibeType: "Twisties",
        description: "The connecting mountain pass from the coast up to the million-year-old limestone caves. Extremely technical and steep corners.",
        latitude: 18.2800,
        longitude: 83.0396,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Bogatha Waterfall Trail",
        anchorCity: "Mulugu",
        category: "Trail",
        vibeType: "OffRoad",
        description: "Often called the 'Niagara of Telangana'. The approach involves crossing sandy river beds and rough, broken dirt patches.",
        latitude: 18.2396,
        longitude: 80.5050,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Coringa Mangrove Approach",
        anchorCity: "Kakinada",
        category: "Coastal",
        vibeType: "Chill",
        description: "A dead-end road leading right into the dense coastal mangroves where the Godavari river meets the ocean. Very quiet and relaxed.",
        latitude: 16.8333,
        longitude: 82.2333,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Ethipothala Falls",
        anchorCity: "Macherla",
        category: "Scenic",
        vibeType: "Chill",
        description: "A fast, open ride south from the Nagarjuna Sagar dam leading to a massive 70-foot river cascade surrounded by greenery.",
        latitude: 16.5298,
        longitude: 79.3149,
        petrolPump: true,
        images: []
    },
    {
        locationName: "Laknavaram Lake Route",
        anchorCity: "Warangal",
        category: "Lake",
        vibeType: "Chill",
        description: "A beautifully shaded canopy road leading to a massive lake hidden within the Govindaraopet forests. Features a massive yellow suspension bridge.",
        latitude: 18.1568,
        longitude: 80.0054,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Papikondalu Riverside",
        anchorCity: "Rajamahendravaram",
        category: "Trail",
        vibeType: "Chill",
        description: "Following the twists and turns of the Godavari river as it cuts through the Papi Hills. Incredibly scenic, slow-paced riding.",
        latitude: 17.4333,
        longitude: 81.5667,
        petrolPump: false,
        images: []
    },
    {
        locationName: "Rollapadu Grasslands",
        anchorCity: "Nandikotkur",
        category: "Scenic",
        vibeType: "Highway",
        description: "An unusual, flat, savanna-like landscape that feels like riding in the African plains. Great open-throttle highway leading up to it.",
        latitude: 15.7275,
        longitude: 78.2917,
        petrolPump: true,
        images: []
    }
];

async function seedDatabase() {
    console.log(`🚀 Injecting ${allTrails.length} premium trails into Firestore...`);
    let added = 0;

    for (const gem of allTrails) {
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