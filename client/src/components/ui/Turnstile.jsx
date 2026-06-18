// src/components/ui/Turnstile.jsx
// Renders the Cloudflare Turnstile CAPTCHA widget and reports the
// verification token back to the parent via onVerify(token).
//
// Setup required: add your Turnstile SITE KEY (public) below or via
// an env var. Get one at: https://dash.cloudflare.com/?to=/:account/turnstile
//
// Usage:
//   <Turnstile onVerify={(token) => setToken(token)} onExpire={() => setToken(null)} />

import { useEffect, useRef, useId } from "react";

// Cloudflare's official "always passes" test site key — replace with your
// real site key before going to production. Using the test key means the
// widget renders and returns a token, but does NOT provide real protection.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

let scriptLoadingPromise = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export default function Turnstile({ onVerify, onExpire, className = "" }) {
  const containerRef = useRef(null);
  const widgetIdRef   = useRef(null);
  const elementId      = useId();

  useEffect(() => {
    let mounted = true;

    loadTurnstileScript().then(() => {
      if (!mounted || !containerRef.current || !window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerify?.(token),
        "expired-callback": () => onExpire?.(),
        "error-callback": () => onExpire?.(),
      });
    });

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={elementId} ref={containerRef} className={className} />;
}
