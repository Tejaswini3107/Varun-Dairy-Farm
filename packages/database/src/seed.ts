import { db } from "./client";

async function seed() {
  console.log("🌱 Seeding Varun Dairy Farm database…");

  // ── Products ──────────────────────────────────────────────────────────────
  const products = await Promise.all([
    db.product.upsert({
      where: { id: "prod_milk" },
      update: {},
      create: {
        id: "prod_milk",
        name: "Toned Milk",
        unit: "L",
        pricePerUnit: 48,
        category: "milk",
        description: "Fresh toned milk — 3.0% fat",
      },
    }),
    db.product.upsert({
      where: { id: "prod_curd" },
      update: {},
      create: {
        id: "prod_curd",
        name: "Curd",
        unit: "cup",
        pricePerUnit: 40,
        category: "curd",
        description: "Set curd — 200 g cup",
      },
    }),
    db.product.upsert({
      where: { id: "prod_ghee" },
      update: {},
      create: {
        id: "prod_ghee",
        name: "Pure Ghee",
        unit: "500ml",
        pricePerUnit: 320,
        category: "ghee",
        description: "Pure cow ghee — 500 ml tin",
      },
    }),
    db.product.upsert({
      where: { id: "prod_paneer" },
      update: {},
      create: {
        id: "prod_paneer",
        name: "Paneer",
        unit: "block",
        pricePerUnit: 80,
        category: "paneer",
        description: "Fresh paneer block — 200 g",
      },
    }),
  ]);

  console.log(`✅ ${products.length} products seeded`);

  // ── Routes ────────────────────────────────────────────────────────────────
  const routes = await Promise.all([
    db.route.upsert({
      where: { id: "route_1" },
      update: {},
      create: { id: "route_1", name: "Route 1", area: "Jubilee Hills", totalStops: 44 },
    }),
    db.route.upsert({
      where: { id: "route_2" },
      update: {},
      create: { id: "route_2", name: "Route 2", area: "Madhapur", totalStops: 38 },
    }),
    db.route.upsert({
      where: { id: "route_3" },
      update: {},
      create: { id: "route_3", name: "Route 3", area: "Kondapur", totalStops: 42 },
    }),
    db.route.upsert({
      where: { id: "route_4" },
      update: {},
      create: { id: "route_4", name: "Route 4", area: "Banjara Hills", totalStops: 36 },
    }),
    db.route.upsert({
      where: { id: "route_5" },
      update: {},
      create: { id: "route_5", name: "Route 5", area: "Gachibowli", totalStops: 38 },
    }),
    db.route.upsert({
      where: { id: "route_6" },
      update: {},
      create: { id: "route_6", name: "Route 6", area: "Hi-Tech City", totalStops: 40 },
    }),
  ]);

  console.log(`✅ ${routes.length} routes seeded`);

  // ── Staff users ───────────────────────────────────────────────────────────
  const staffUsers = [
    { id: "user_sk", phone: "9100000001", name: "Sanjay Kumar", role: "delivery_staff" as const },
    { id: "user_am", phone: "9100000002", name: "Amit Mishra", role: "delivery_staff" as const },
    { id: "user_dr", phone: "9100000003", name: "Deepak R", role: "delivery_staff" as const },
    { id: "user_admin", phone: "9100000000", name: "Varun", role: "admin" as const },
  ];

  for (const u of staffUsers) {
    const user = await db.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, phone: u.phone, name: u.name, role: u.role },
    });

    if (u.role === "delivery_staff") {
      await db.staff.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, role: "delivery_agent" },
      });
    }
  }

  console.log(`✅ Staff seeded`);

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerData = [
    { id: "user_mr", phone: "9800000012", name: "Meera Reddy", area: "Kondapur", address: "Flat 301, Lotus Apts", routeId: "route_3", wallet: 676 },
    { id: "user_vs", phone: "9900000004", name: "Vikram Singh", area: "Kondapur", address: "Plot 14, Kondapur Main", routeId: "route_3", wallet: 240 },
    { id: "user_ar", phone: "9700000088", name: "Anjali Rao", area: "Gachibowli", address: "Tower B, Apt 802", routeId: "route_5", wallet: 1120 },
    { id: "user_rm", phone: "9600000051", name: "Rahul Mehta", area: "Madhapur", address: "Flat 5, Sai Nagar", routeId: "route_2", wallet: -120 },
    { id: "user_kp", phone: "9000000033", name: "Kavya Patel", area: "Jubilee Hills", address: "Villa 12, Green Valley", routeId: "route_1", wallet: 540 },
  ];

  for (const c of customerData) {
    const user = await db.user.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, phone: c.phone, name: c.name, role: "customer" },
    });

    await db.customer.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        address: c.address,
        area: c.area,
        routeId: c.routeId,
        walletBalance: c.wallet,
        autoPay: c.wallet > 0,
      },
    });
  }

  console.log(`✅ ${customerData.length} customers seeded`);

  // ── Inventory ─────────────────────────────────────────────────────────────
  const inventoryData = [
    { productId: "prod_milk", batchNumber: "B-2261", quantity: 200, capacity: 620, reorderLevel: 200, status: "low" as const },
    { productId: "prod_curd", batchNumber: "B-2258", quantity: 410, capacity: 560, reorderLevel: 100, status: "healthy" as const },
    { productId: "prod_ghee", batchNumber: "B-2240", quantity: 12, capacity: 140, reorderLevel: 20, status: "critical" as const },
    { productId: "prod_paneer", batchNumber: "B-2241", quantity: 64, capacity: 140, reorderLevel: 30, status: "expiring" as const },
  ];

  for (const inv of inventoryData) {
    await db.inventory.create({ data: inv }).catch(() => {});
  }

  console.log(`✅ Inventory seeded`);
  console.log("🎉 Seed complete!");
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
