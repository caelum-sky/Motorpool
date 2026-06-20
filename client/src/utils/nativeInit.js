// src/utils/nativeInit.js
// Runs once on app startup, only when actually inside a Capacitor native
// shell (Android/iOS app) — does nothing in the regular browser.

import { Capacitor } from "@capacitor/core";

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");

    // Overlay mode makes the WebView extend behind the status bar, which
    // is required for env(safe-area-inset-top) to return the real inset
    // value rather than 0. Without this, the status bar just sits on top
    // of the app and the header is hidden behind it.
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setBackgroundColor({ color: "#7B1C1C" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Status bar plugin not available on this platform — safe to ignore.
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // Splash screen plugin not available — safe to ignore.
  }
}
