// src/utils/apiConfig.js
// Resolves the correct backend base URL depending on where the app is running.
//
// ─── AFTER YOU DEPLOY THE BACKEND TO RENDER ───────────────────────────────────
// 1. Copy your Render service URL (e.g. https://buksu-motorpool-api.onrender.com)
// 2. Set PRODUCTION_API_URL below to that URL + "/api"
// 3. Run npm run cap:android from the client/ folder to rebuild and sync
// ─────────────────────────────────────────────────────────────────────────────

// Replace this with your real Render URL after deployment:
export const PRODUCTION_API_URL = "https://motorpool-gllh.onrender.com/api";

// For testing on a real device BEFORE deployment (phone + laptop on same WiFi):
// 1. Run `ipconfig` on your laptop, find "IPv4 Address" under your WiFi adapter
// 2. Replace the IP below with your actual LAN IP (e.g. 192.168.1.42)
// 3. Make sure server is running with npm run dev in server/
export const LOCAL_NETWORK_API_URL = "http://YOUR_LAN_IP:5000/api";

function isNativeMobile() {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

export function getApiBaseUrl() {
  if (isNativeMobile()) {
    // Switch to PRODUCTION_API_URL once your backend is deployed on Render
    return PRODUCTION_API_URL;
  }
  // Web browser — Vite proxy handles /api → localhost:5000 automatically
  return "/api";
}