// server/diagnose-network.js
// Run this locally to check whether your machine can reach the external
// services this app depends on. Usage:
//   node diagnose-network.js

const dns = require("dns");
const https = require("https");

function checkDNS(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        resolve({ hostname, ok: false, error: err.message });
      } else {
        resolve({ hostname, ok: true, address });
      }
    });
  });
}

function checkHTTPS(hostname) {
  return new Promise((resolve) => {
    const req = https.get(`https://${hostname}`, { timeout: 5000 }, (res) => {
      resolve({ hostname, ok: true, statusCode: res.statusCode });
      res.resume();
    });
    req.on("error", (err) => resolve({ hostname, ok: false, error: err.message }));
    req.on("timeout", () => { req.destroy(); resolve({ hostname, ok: false, error: "timeout" }); });
  });
}

async function run() {
  console.log("🔍  Checking DNS resolution...\n");

  const hosts = [
    "www.googleapis.com",
    "identitytoolkit.googleapis.com",
    "challenges.cloudflare.com",
    "smtp.gmail.com",
    "firestore.googleapis.com",
  ];

  for (const host of hosts) {
    const dnsResult = await checkDNS(host);
    if (dnsResult.ok) {
      console.log(`  ✅  DNS OK   ${host} → ${dnsResult.address}`);
    } else {
      console.log(`  ❌  DNS FAIL ${host} → ${dnsResult.error}`);
    }
  }

  console.log("\n🔍  Checking HTTPS connectivity...\n");

  for (const host of hosts) {
    const httpsResult = await checkHTTPS(host);
    if (httpsResult.ok) {
      console.log(`  ✅  HTTPS OK   ${host} (status ${httpsResult.statusCode})`);
    } else {
      console.log(`  ❌  HTTPS FAIL ${host} → ${httpsResult.error}`);
    }
  }

  console.log("\n📋  If any of the above show FAIL, your network/firewall/antivirus");
  console.log("    is blocking Node.js from reaching that host. Try:");
  console.log("    1. Temporarily disable antivirus/firewall and re-run this script");
  console.log("    2. Disconnect any VPN and re-run");
  console.log("    3. Switch DNS to 8.8.8.8 (Google) or 1.1.1.1 (Cloudflare) in Windows network settings");
  console.log("    4. Try a different network (mobile hotspot) to confirm it's network-specific\n");

  process.exit(0);
}

run();
