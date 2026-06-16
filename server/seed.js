// server/seed.js
// Run once to populate Firestore with sample BukSU Motorpool data.
// Usage: node seed.js
//
// ⚠️  This OVERWRITES existing demo data. Run only on a fresh project.

require("dotenv").config();
const { db } = require("./config/firebase");

async function seed() {
  console.log("🌱  Seeding BukSU Motorpool Firestore...\n");

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const vehicles = [
    {
      plateNumber: "SKL 234",
      brand: "Toyota",
      model: "HiAce Commuter",
      type: "van",
      engineDisplacement: "2.5L Diesel",
      currentOdometer: 48320,
      conditionStatus: "available",
      assignedDriverId: null,
      notes: "Main campus shuttle",
    },
    {
      plateNumber: "AAA 001",
      brand: "Isuzu",
      model: "Crosswind XUV",
      type: "utility",
      engineDisplacement: "2.5L Diesel",
      currentOdometer: 92100,
      conditionStatus: "available",
      assignedDriverId: null,
      notes: "Admin pool vehicle",
    },
    {
      plateNumber: "BUK 777",
      brand: "Mitsubishi",
      model: "Rosa Bus",
      type: "bus",
      engineDisplacement: "4.2L Diesel",
      currentOdometer: 215400,
      conditionStatus: "dispatched",
      assignedDriverId: null,
      notes: "Intercollegiate sports transport",
    },
    {
      plateNumber: "EMS 911",
      brand: "Toyota",
      model: "Hi-Lux Ambulance",
      type: "ambulance",
      engineDisplacement: "2.4L Diesel",
      currentOdometer: 31500,
      conditionStatus: "available",
      assignedDriverId: null,
      notes: "Medical emergency vehicle",
    },
    {
      plateNumber: "PPM 002",
      brand: "Ford",
      model: "Ranger XL",
      type: "utility",
      engineDisplacement: "2.0L Diesel",
      currentOdometer: 67800,
      conditionStatus: "maintenance",
      assignedDriverId: null,
      notes: "PPMU maintenance truck",
    },
  ];

  for (const v of vehicles) {
    await db.collection("vehicles").add({
      ...v,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✅  Vehicle: ${v.plateNumber} ${v.model}`);
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  const parts = [
    { itemName: "Engine Oil (10W-40)", category: "lubricants",   stockQty: 24,  reorderLevel: 10, unitCost: 280,   unit: "liter",  shelfLocation: "Shelf A-1", supplier: "Petron" },
    { itemName: "Oil Filter",           category: "filters",      stockQty: 8,   reorderLevel: 5,  unitCost: 145,   unit: "piece",  shelfLocation: "Shelf A-2", supplier: "Nippon" },
    { itemName: "Air Filter",           category: "filters",      stockQty: 4,   reorderLevel: 5,  unitCost: 380,   unit: "piece",  shelfLocation: "Shelf A-3", supplier: "Nippon" },
    { itemName: "Brake Fluid (DOT 3)",  category: "lubricants",   stockQty: 6,   reorderLevel: 3,  unitCost: 120,   unit: "liter",  shelfLocation: "Shelf B-1", supplier: "Castrol" },
    { itemName: "Fan Belt (Universal)", category: "spare_parts",  stockQty: 3,   reorderLevel: 4,  unitCost: 450,   unit: "piece",  shelfLocation: "Shelf C-2", supplier: "Gates" },
    { itemName: "Spark Plug Set",       category: "spare_parts",  stockQty: 12,  reorderLevel: 4,  unitCost: 220,   unit: "set",    shelfLocation: "Shelf C-3", supplier: "NGK" },
    { itemName: "Tire 205/65 R15",      category: "tires",        stockQty: 2,   reorderLevel: 4,  unitCost: 3800,  unit: "piece",  shelfLocation: "Bay D-1",   supplier: "Bridgestone" },
    { itemName: "Battery 12V 70Ah",     category: "batteries",    stockQty: 1,   reorderLevel: 2,  unitCost: 4200,  unit: "piece",  shelfLocation: "Shelf E-1", supplier: "Motolite" },
    { itemName: "Coolant (Ready Mix)",  category: "lubricants",   stockQty: 10,  reorderLevel: 5,  unitCost: 180,   unit: "liter",  shelfLocation: "Shelf A-4", supplier: "Prestone" },
    { itemName: "Wiper Blade 20\"",     category: "spare_parts",  stockQty: 6,   reorderLevel: 3,  unitCost: 250,   unit: "piece",  shelfLocation: "Shelf C-1", supplier: "Bosch" },
    { itemName: "Fuse Set (Assorted)",  category: "electrical",   stockQty: 20,  reorderLevel: 10, unitCost: 15,    unit: "piece",  shelfLocation: "Shelf F-1", supplier: "Local" },
    { itemName: "Transmission Fluid",  category: "lubricants",   stockQty: 3,   reorderLevel: 4,  unitCost: 320,   unit: "liter",  shelfLocation: "Shelf A-5", supplier: "Castrol" },
  ];

  for (const p of parts) {
    await db.collection("inventory").add({
      ...p,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✅  Part: ${p.itemName}`);
  }

  // ── Maintenance Logs ──────────────────────────────────────────────────────
  const logs = [
    {
      maintenanceType: "preventive",
      jobDescription:  "PMS — Oil change, oil filter, air filter replacement",
      datePerformed:   "2025-05-10",
      technicianName:  "Eduardo Santos",
      laborCost:       500,
      partsUsed: [
        { partId: "seed", itemName: "Engine Oil (10W-40)", qtyUsed: 4, unitCost: 280 },
        { partId: "seed", itemName: "Oil Filter",          qtyUsed: 1, unitCost: 145 },
      ],
      nextServiceKM:   53320,
      status:          "completed",
      remarks:         "Next PMS at 53,320 km",
    },
    {
      maintenanceType: "corrective",
      jobDescription:  "Replace fan belt — snapped during dispatch",
      datePerformed:   "2025-06-01",
      technicianName:  "Roberto Cruz",
      laborCost:       300,
      partsUsed: [
        { partId: "seed", itemName: "Fan Belt (Universal)", qtyUsed: 1, unitCost: 450 },
      ],
      nextServiceKM:   null,
      status:          "completed",
      remarks:         "Emergency repair",
    },
    {
      maintenanceType: "corrective",
      jobDescription:  "Engine overheating — flush cooling system, replace coolant",
      datePerformed:   "2025-06-10",
      technicianName:  "Eduardo Santos",
      laborCost:       800,
      partsUsed: [
        { partId: "seed", itemName: "Coolant (Ready Mix)", qtyUsed: 5, unitCost: 180 },
      ],
      nextServiceKM:   null,
      status:          "open",
      remarks:         "Awaiting test drive confirmation",
    },
  ];

  // Get first 3 vehicle IDs to attach logs to
  const vSnap = await db.collection("vehicles").limit(3).get();
  const vIds  = vSnap.docs.map((d) => d.id);

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const partsCost = log.partsUsed.reduce((s, p) => s + p.unitCost * p.qtyUsed, 0);
    await db.collection("maintenance_logs").add({
      ...log,
      vehicleId:  vIds[i] || vIds[0],
      partsCost,
      totalCost:  partsCost + log.laborCost,
      createdAt:  new Date(),
      updatedAt:  new Date(),
    });
    console.log(`  ✅  Maintenance: ${log.jobDescription.slice(0, 50)}`);
  }

  console.log("\n🎉  Seed complete! Open the app and sign in to see your data.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
