// server/routes/users.js
// Admin-only endpoints to create and manage user accounts.
// Uses Firebase Admin SDK so admins can create accounts for ANY office/department
// and role without those users needing to self-register.

const express = require("express");
const router = express.Router();
const { auth, db } = require("../config/firebase");
const { verifyToken, requireRole } = require("../middleware/auth");

const VALID_ROLES = ["admin", "motorpool", "driver", "staff"];

// ── GET /api/users ── list all users (admin only)
router.get("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    res.json(snapshot.docs.map((d) => ({ uid: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/users ── create a new account for any role/office (admin only)
// Creates the Firebase Auth user AND the Firestore profile in one call.
router.post("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role, officeDepartment } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "name, email, password, and role are required" });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "password must be at least 6 characters" });
    }

    // Create the Firebase Auth account
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    // Create the matching Firestore profile
    const profile = {
      name,
      email,
      role,
      officeDepartment: officeDepartment || "",
      createdAt: new Date(),
      createdBy: req.user.uid,
    };

    await db.collection("users").doc(userRecord.uid).set(profile);

    res.status(201).json({ uid: userRecord.uid, ...profile });
  } catch (err) {
    const messages = {
      "auth/email-already-exists": "An account with this email already exists.",
      "auth/invalid-email":        "Invalid email address.",
      "auth/invalid-password":     "Password must be at least 6 characters.",
    };
    res.status(400).json({ error: messages[err.code] || err.message });
  }
});

// ── PATCH /api/users/:uid/role ── change a user's role (admin only)
router.patch("/:uid/role", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    }
    await db.collection("users").doc(req.params.uid).update({ role });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/users/:uid ── remove a user (admin only)
// Deletes both the Auth account and the Firestore profile.
router.delete("/:uid", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    if (req.params.uid === req.user.uid) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }
    await auth.deleteUser(req.params.uid).catch(() => {
      // Auth user may already be gone — proceed to clean up Firestore regardless
    });
    await db.collection("users").doc(req.params.uid).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
