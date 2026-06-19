// src/utils/apiConfig.js
// Resolves the correct backend base URL depending on where the app is
// running. This matters because a native mobile app (via Capacitor) has
// no "same origin" to be relative to — it always needs the FULL deployed
// backend URL, unlike the web build which can use a relative /api path.

// Set this to your deployed backend's public URL once it's live, e.g.
// "https://buksu-motorpool-api.onrender.com/api"
// Leave as-is during local development; the dev server values below cover that.
export const PRODUCTION_API_URL = "https://YOUR-DEPLOYED-BACKEND-URL/api";

// When testing the mobile app against your laptop's dev server over the
// same WiFi network (before the backend is deployed), set this to your
// laptop's LAN IP, e.g. "http://192.168.1.42:5000/api"
// Find your IP with `ipconfig` (Windows) and look for "IPv4 Address".
const LOCAL_NETWORK_API_URL = 'http://192.168.25.43:5000/api';

function isNativeMobile() {
  // Capacitor injects this global on native iOS/Android builds.
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

export function getApiBaseUrl() {
  if (isNativeMobile()) {
    // Native apps can never use a relative path — always need a full URL.
    // Swap this to PRODUCTION_API_URL once the backend is deployed.
    return LOCAL_NETWORK_API_URL;
  }

  // Web (browser) — relative path works fine, handled by Vite's dev proxy
  // locally and by same-origin hosting (or your own reverse proxy) in prod.
  return "/api";
}