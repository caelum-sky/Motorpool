// src/utils/firebase.js
// Firebase CLIENT SDK — used in the browser for auth and direct Firestore reads.

import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyA-7QOlqBrw2yayA8__QNmBDGvMv8b6wcY",
  authDomain:        "storage-17950.firebaseapp.com",
  databaseURL:       "https://storage-17950-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "storage-17950",
  storageBucket:     "storage-17950.firebasestorage.app",
  messagingSenderId: "703625141848",
  appId:             "1:703625141848:web:b2967a703469c24060742d",
  measurementId:     "G-QY785Y237K",
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

export default app;