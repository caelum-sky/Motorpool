// src/utils/nativeInit.js
// Runs once on app startup, only when actually inside a Capacitor native
// shell (Android/iOS app) — does nothing in the regular browser, so the
// web version of the app is completely unaffected.

import { Capacitor } from "@capacitor/core";

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setBackgroundColor({ color: "#7B1C1C" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Status bar plugin not available on this platform — safe to ignore.
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Hide explicitly once React has mounted, rather than relying solely
    // on the auto-hide timer — avoids a flash of unstyled content if the
    // app takes a moment longer to render on a slower device.
    await SplashScreen.hide();
  } catch {
    // Splash screen plugin not available — safe to ignore.
  }
}
