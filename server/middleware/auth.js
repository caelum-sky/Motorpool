// server/middleware/auth.js
// Verifies Firebase ID tokens on protected routes.
// Attaches decoded user + Firestore role to req.user.

const { auth, db } = require("../config/firebase");

/**
 * verifyToken — validates the Bearer token from Authorization header.
 * Adds { uid, email, role, name } to req.user.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: no token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);

    // Fetch the user's role from Firestore
    const userDoc = await db.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "User profile not found in Firestore" });
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      ...userDoc.data(),
    };

    next();
  } catch (err) {
    if (err.message?.includes("ENOTFOUND") || err.code === "ENOTFOUND") {
      console.error(
        "❌  DNS lookup failed for googleapis.com — this server cannot reach Google's network at all.\n" +
        "    This is a network/firewall/DNS issue on this machine, not a code bug.\n" +
        "    Run `node diagnose-network.js` in the server folder, or try disabling VPN/antivirus/firewall."
      );
      return res.status(503).json({
        error: "Server cannot reach Firebase/Google services — check your network or DNS settings.",
      });
    }

    // A 16 UNAUTHENTICATED here, when it happens on every single request
    // (not intermittently) and the system clock is confirmed correct, almost
    // always means the service account key itself is no longer valid —
    // typically because it was deleted/rotated in Firebase Console after
    // serviceAccountKey.json was downloaded. Re-downloading a fresh key
    // fixes this; clock sync does not.
    if (err.code === 16 || err.message?.includes("UNAUTHENTICATED")) {
      console.error(
        `❌  Token rejected as UNAUTHENTICATED on every request.\n` +
        `    If your system clock is already correct (check Settings → Time & Language → Date & Time),\n` +
        `    this means the service account key (server/config/serviceAccountKey.json) is no longer valid.\n` +
        `    Fix: Firebase Console → Project Settings → Service Accounts → Generate new private key,\n` +
        `    then replace server/config/serviceAccountKey.json with the new file and restart the server.\n` +
        `    Original error: ${err.message}`
      );
      return res.status(401).json({
        error: "Authentication failed — the server's Firebase service account key may be invalid or revoked. Generate a new one from Firebase Console → Project Settings → Service Accounts.",
      });
    }

    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
};

/**
 * requireRole(...roles) — middleware factory for role-based access.
 * Usage: router.post('/vehicles', verifyToken, requireRole('admin','motorpool'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Forbidden: requires one of [${roles.join(", ")}]`,
    });
  }
  next();
};

module.exports = { verifyToken, requireRole };