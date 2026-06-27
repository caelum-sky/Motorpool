// server/config/firebase.js
// Firebase Admin SDK — initialized once and reused across all routes.
//
// Supports two ways to provide the service account credentials:
//
// 1. LOCAL DEV: Place serviceAccountKey.json in this /config directory.
//    This file is gitignored and never committed.
//
// 2. PRODUCTION (Render/Railway/etc): Set the FIREBASE_SERVICE_ACCOUNT
//    environment variable to the full JSON content of serviceAccountKey.json.
//    In Render dashboard: Environment → Add Environment Variable →
//    key: FIREBASE_SERVICE_ACCOUNT, value: (paste the entire JSON).

const admin = require("firebase-admin");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: parse from environment variable
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅  Using FIREBASE_SERVICE_ACCOUNT env var");
  } catch (err) {
    console.error(
      "❌  FIREBASE_SERVICE_ACCOUNT env var is set but contains invalid JSON.\n" +
      "    Make sure you pasted the entire serviceAccountKey.json content as one line."
    );
    process.exit(1);
  }
} else {
  // Local dev: load from file
  try {
    serviceAccount = require("./serviceAccountKey.json");
  } catch (err) {
    console.error(
      "❌  serviceAccountKey.json not found in /server/config/\n" +
      "    For local dev: download from Firebase Console → Project Settings → Service Accounts\n" +
      "    For production: set the FIREBASE_SERVICE_ACCOUNT environment variable instead"
    );
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
  });
  console.log("✅  Firebase Admin SDK initialized — project:", serviceAccount.project_id);
}

const db   = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };