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
