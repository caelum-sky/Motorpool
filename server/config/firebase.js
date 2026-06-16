// server/config/firebase.js
// Firebase Admin SDK — initialized once and reused across all routes.
// Place your serviceAccountKey.json in this same /config directory.

const admin = require("firebase-admin");
const path = require("path");

let serviceAccount;

try {
  serviceAccount = require("./serviceAccountKey.json");
} catch (err) {
  console.error(
    "❌  serviceAccountKey.json not found in /server/config/\n" +
    "    Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key"
  );
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
  console.log("✅  Firebase Admin SDK initialized — project:", serviceAccount.project_id);
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };
