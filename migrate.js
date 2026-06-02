import admin from 'firebase-admin';
import fs from 'fs';

// 🛑 INITIALIZE FIREBASE 🛑
const serviceAccount = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 📂 READ LOCAL DATABASE 
const dbPath = './database.json';

async function migrate() {
    if (!fs.existsSync(dbPath)) {
        console.error(`❌ Error: Could not find your local "${dbPath}" file. Make sure it is in this folder!`);
        return;
    }

    try {
        const localData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        console.log(`🚀 Starting migration of ${localData.length} locations to Firestore...\n`);
        
        for (const gem of localData) {
            // Generate a clean, readable document ID from the location name
            const docId = gem.locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            // Upload to the 'trails' collection
            await db.collection('trails').doc(docId).set({
                ...gem,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`   ✅ Uploaded: "${gem.locationName}" -> Document ID: ${docId}`);
        }
        
        console.log('\n🏁 MIGRATION COMPLETE! Refresh your Firebase console to see the data.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

migrate();