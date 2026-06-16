// server/createAccounts.js
// Creates Firebase Auth accounts + matching Firestore /users/{uid} profiles
// for all 4 roles in one shot.
//
// Usage: node createAccounts.js
//
// ⚠️  If an account with the same email already exists, it will be SKIPPED
//     (not overwritten) to avoid accidentally resetting passwords in use.

require("dotenv").config();
const { auth, db } = require("./config/firebase");

const ACCOUNTS = [
  {
    email: "admin@buksu.edu.ph",
    password: "Admin@123",
    name: "PPMU Head Administrator",
    role: "admin",
    officeDepartment: "PPMU - Office of the Head",
  },
  {
    email: "motorpool@buksu.edu.ph",
    password: "Motorpool@123",
    name: "Motorpool Section-in-Charge",
    role: "motorpool",
    officeDepartment: "PPMU - Motorpool Section",
  },
  {
    email: "driver@buksu.edu.ph",
    password: "Driver@123",
    name: "Juan Dela Cruz",
    role: "driver",
    officeDepartment: "PPMU - Motorpool Section",
  },
  {
    email: "staff@buksu.edu.ph",
    password: "Staff@123",
    name: "Maria Santos",
    role: "staff",
    officeDepartment: "College of Arts and Sciences",
  },
];

async function createOrGetUser(acc) {
  try {
    // Try to fetch an existing user by email first
    const existing = await auth.getUserByEmail(acc.email);
    console.log(`  ⏭️   ${acc.role.padEnd(10)} ${acc.email} already exists (uid: ${existing.uid}) — skipping Auth creation`);
    return existing.uid;
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
  }

  // Doesn't exist yet — create it
  const userRecord = await auth.createUser({
    email: acc.email,
    password: acc.password,
    displayName: acc.name,
    emailVerified: true,
  });
  console.log(`  ✅  ${acc.role.padEnd(10)} ${acc.email} created (uid: ${userRecord.uid})`);
  return userRecord.uid;
}

async function run() {
  console.log("🔐  Provisioning BukSU Motorpool demo accounts...\n");

  const created = [];

  for (const acc of ACCOUNTS) {
    const uid = await createOrGetUser(acc);

    // Write/overwrite the Firestore profile so role is always correct
    await db.collection("users").doc(uid).set({
      name: acc.name,
      email: acc.email,
      role: acc.role,
      officeDepartment: acc.officeDepartment,
      createdAt: new Date(),
    }, { merge: true });

    created.push({ ...acc, uid });
  }

  console.log("\n✅  All accounts ready. Firestore profiles written.\n");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("  LOGIN CREDENTIALS");
  console.log("─────────────────────────────────────────────────────────────");
  for (const a of created) {
    console.log(`  ${a.role.padEnd(10)} | ${a.email.padEnd(24)} | ${a.password}`);
  }
  console.log("─────────────────────────────────────────────────────────────\n");
  console.log("Sign in at http://localhost:5173 with any of the accounts above.\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("❌  Failed:", err.message);
  process.exit(1);
});
