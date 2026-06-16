// src/utils/firebase.js
// Firebase CLIENT SDK — used in the browser for auth and direct Firestore reads.
// Replace the config values below with those from Firebase Console →
// Project Settings → Your apps → SDK setup → Config (web).

import { initializeApp } from "firebase/app";
import { getAuth }        from "firebase/auth";
import { getFirestore }   from "firebase/firestore";
import { getStorage }     from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyBrVjNnuhwNBaZJJDLw82cJBksj_lDv1qM",
  authDomain:        "storage-17950.firebaseapp.com",
  projectId:         "storage-17950",
  storageBucket:     "storage-17950.firebasestorage.app",
  messagingSenderId: "703625141848",
  appId:             "1:703625141848:android:d343e176cc82f33060742d",
};

const app  = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

export default app;
