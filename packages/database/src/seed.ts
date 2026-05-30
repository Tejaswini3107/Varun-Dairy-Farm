import { db } from "./client";

function otp() { return Math.floor(1000 + Math.random() * 9000).toString(); }

async function seed() {
  console.log("🌱 Seeding Varun Dairy Farm database…\n");

  // ── Products ───────────────────────────────────────────────────────────────
  const [milk, curd, ghee, paneer] = await Promise.all([
    db.product.upsert({ where: { id: "prod_milk" }, update: { pricePerUnit: 48 }, create: { id: "prod_milk", name: "Toned Milk", unit: "L", pricePerUnit: 48, category: "milk", description: "Fresh toned milk — 3.0% fat" } }),
    db.product.upsert({ where: { id: "prod_curd" }, update: { pricePerUnit: 40 }, create: { id: "prod_curd", name: "Curd", unit: "cup", pricePerUnit: 40, category: "curd", description: "Set curd — 200 g cup" } }),
    db.product.upsert({ where: { id: "prod_ghee" }, update: { pricePerUnit: 320 }, create: { id: "prod_ghee", name: "Pure Ghee", unit: "500ml", pricePerUnit: 320, category: "ghee", description: "Pure cow ghee — 500 ml tin" } }),
    db.product.upsert({ where: { id: "prod_paneer" }, update: { pricePerUnit: 80 }, create: { id: "prod_paneer", name: "Paneer", unit: "block", pricePerUnit: 80, category: "paneer", description: "Fresh paneer block — 200 g" } }),
  ]);
  console.log("✅ 4 products");

  // ── Routes (no agent yet — assigned below) ────────────────────────────────
  const routeData = [
    { id: "route_1", name: "Route A", area: "Kondapur" },
    { id: "route_2", name: "Route B", area: "Madhapur" },
    { id: "route_3", name: "Route C", area: "Gachibowli" },
    { id: "route_4", name: "Route D", area: "Jubilee Hills" },
  ];
  for (const r of routeData) {
    await db.route.upsert({ where: { id: r.id }, update: {}, create: r });
  }
  console.log("✅ 4 routes");

  // ── Admin ─────────────────────────────────────────────────────────────────
  await db.user.upsert({ where: { id: "user_admin" }, update: {}, create: { id: "user_admin", phone: "9100000000", name: "Varun Admin", role: "admin" } });
  console.log("✅ Admin user (phone: 9100000000)");

  // ── Delivery staff ────────────────────────────────────────────────────────
  const agentData = [
    { userId: "user_sk", phone: "9100000001", name: "Suresh Kumar" },
    { userId: "user_am", phone: "9100000002", name: "Amit Yadav" },
    { userId: "user_dr", phone: "9100000003", name: "Deepak Reddy" },
  ];
  const agents: any[] = [];
  for (const a of agentData) {
    const user = await db.user.upsert({ where: { id: a.userId }, update: {}, create: { id: a.userId, phone: a.phone, name: a.name, role: "delivery_staff" } });
    const staff = await db.staff.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, role: "delivery_agent" } });
    agents.push(staff);
  }
  console.log("✅ 3 delivery agents (phones: 9100000001–03)");

  // ── Assign agents to routes ────────────────────────────────────────────────
  await db.route.update({ where: { id: "route_1" }, data: { agentId: agents[0].id } });
  await db.route.update({ where: { id: "route_2" }, data: { agentId: agents[1].id } });
  await db.route.update({ where: { id: "route_3" }, data: { agentId: agents[2].id } });
  console.log("✅ Agents assigned to routes");

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerData = [
    { uid: "user_mr", phone: "9800000001", name: "Meera Reddy",     area: "Kondapur",    city: "Hyderabad", address: "Flat 301, Lotus Apts, Kondapur Main Rd", routeId: "route_1", stop: 1,  wallet: 850 },
    { uid: "user_vs", phone: "9800000002", name: "Vikram Singh",    area: "Kondapur",    city: "Hyderabad", address: "Plot 14, Srinivasa Colony, Kondapur",    routeId: "route_1", stop: 2,  wallet: 240 },
    { uid: "user_kp", phone: "9800000003", name: "Kavya Patel",     area: "Kondapur",    city: "Hyderabad", address: "Villa 7, Green Meadows, Kondapur",       routeId: "route_1", stop: 3,  wallet: 1200 },
    { uid: "user_ar", phone: "9800000004", name: "Anjali Rao",      area: "Madhapur",    city: "Hyderabad", address: "Tower B, Apt 802, Cyber Heights",        routeId: "route_2", stop: 1,  wallet: 600 },
    { uid: "user_rm", phone: "9800000005", name: "Rahul Mehta",     area: "Madhapur",    city: "Hyderabad", address: "Flat 5, Sai Residency, Madhapur",        routeId: "route_2", stop: 2,  wallet: -180 },
    { uid: "user_sp", phone: "9800000006", name: "Sneha Pillai",    area: "Gachibowli",  city: "Hyderabad", address: "House 23, Lane 4, Gachibowli",           routeId: "route_3", stop: 1,  wallet: 450 },
    { uid: "user_rk", phone: "9800000007", name: "Ravi Kiran",      area: "Gachibowli",  city: "Hyderabad", address: "Apt 1102, Prestige Towers, Gachibowli",  routeId: "route_3", stop: 2,  wallet: 980 },
    { uid: "user_pd", phone: "9800000008", name: "Priya Das",       area: "Jubilee Hills", city: "Hyderabad", address: "Bungalow 45, Road 12, Jubilee Hills",  routeId: "route_4", stop: 1,  wallet: 3200 },
    { uid: "user_ns", phone: "9800000009", name: "Naveen Sharma",   area: "Jubilee Hills", city: "Hyderabad", address: "Flat 201, Park View Apts, Jubilee Hills", routeId: "route_4", stop: 2, wallet: 760 },
    { uid: "user_dp", phone: "9800000010", name: "Divya Prasad",    area: "Kondapur",    city: "Hyderabad", address: "Flat 504, KPC Layout, Kondapur",         routeId: "route_1", stop: 4,  wallet: 310 },
  ];

  const customers: any[] = [];
  for (const c of customerData) {
    const user = await db.user.upsert({ where: { id: c.uid }, update: {}, create: { id: c.uid, phone: c.phone, name: c.name, role: "customer" } });
    const cust = await db.customer.upsert({
      where: { userId: user.id }, update: { walletBalance: c.wallet },
      create: { userId: user.id, address: c.address, area: c.area, city: c.city, routeId: c.routeId, stopSequence: c.stop, walletBalance: c.wallet, autoPay: c.wallet > 200 },
    });
    customers.push(cust);
  }
  console.log(`✅ ${customers.length} customers`);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const subDefs = [
    // Meera Reddy
    { customerId: customers[0].id, productId: milk.id, quantity: 2, frequency: "daily" as const },
    { customerId: customers[0].id, productId: curd.id, quantity: 1, frequency: "daily" as const },
    // Vikram Singh
    { customerId: customers[1].id, productId: milk.id, quantity: 1.5, frequency: "daily" as const },
    // Kavya Patel
    { customerId: customers[2].id, productId: milk.id, quantity: 3, frequency: "daily" as const },
    { customerId: customers[2].id, productId: ghee.id, quantity: 1, frequency: "monthly" as const },
    // Anjali Rao
    { customerId: customers[3].id, productId: milk.id, quantity: 2, frequency: "daily" as const },
    { customerId: customers[3].id, productId: curd.id, quantity: 2, frequency: "alternate" as const },
    // Rahul Mehta
    { customerId: customers[4].id, productId: milk.id, quantity: 1, frequency: "daily" as const },
    { customerId: customers[4].id, productId: paneer.id, quantity: 1, frequency: "weekly" as const },
    // Sneha Pillai
    { customerId: customers[5].id, productId: milk.id, quantity: 2.5, frequency: "daily" as const },
    { customerId: customers[5].id, productId: curd.id, quantity: 1, frequency: "daily" as const },
    // Ravi Kiran
    { customerId: customers[6].id, productId: milk.id, quantity: 4, frequency: "daily" as const },
    { customerId: customers[6].id, productId: ghee.id, quantity: 1, frequency: "monthly" as const },
    { customerId: customers[6].id, productId: paneer.id, quantity: 2, frequency: "weekly" as const },
    // Priya Das
    { customerId: customers[7].id, productId: milk.id, quantity: 3, frequency: "daily" as const },
    { customerId: customers[7].id, productId: curd.id, quantity: 3, frequency: "daily" as const },
    { customerId: customers[7].id, productId: ghee.id, quantity: 1, frequency: "monthly" as const },
    // Naveen Sharma
    { customerId: customers[8].id, productId: milk.id, quantity: 2, frequency: "daily" as const },
    // Divya Prasad
    { customerId: customers[9].id, productId: milk.id, quantity: 1, frequency: "daily" as const },
    { customerId: customers[9].id, productId: curd.id, quantity: 1, frequency: "alternate" as const },
  ];

  const createdSubs: any[] = [];
  for (const s of subDefs) {
    const sub = await db.subscription.create({ data: s });
    createdSubs.push(sub);
  }
  console.log(`✅ ${createdSubs.length} subscriptions`);

  // ── Today's orders ────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const groupedSubs = new Map<string, typeof subDefs>();
  for (const s of createdSubs) {
    if (!groupedSubs.has(s.customerId)) groupedSubs.set(s.customerId, []);
    groupedSubs.get(s.customerId)!.push(s);
  }

  const productMap = new Map([
    [milk.id, milk], [curd.id, curd], [ghee.id, ghee], [paneer.id, paneer],
  ]);

  let orderCount = 0;
  for (const [customerId, subs] of groupedSubs) {
    const customer = customers.find(c => c.id === customerId)!;
    const route = routeData.find(r => r.id === customer.routeId)!;
    const agent = await db.route.findUnique({ where: { id: customer.routeId }, select: { agentId: true } });

    const items = subs.map(s => {
      const p = productMap.get(s.productId)!;
      return { productId: s.productId, quantity: s.quantity, unitPrice: p.pricePerUnit, totalPrice: s.quantity * p.pricePerUnit };
    });
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    const orderStatus = orderCount < 4 ? "delivered" : orderCount < 7 ? "out_for_delivery" : "assigned";

    const order = await db.order.create({
      data: {
        customerId,
        routeId: customer.routeId,
        deliveryAgentId: agent?.agentId ?? null,
        status: orderStatus,
        totalAmount,
        otp: otp(),
        date: today,
        stopSequence: customer.stopSequence,
        deliveredAt: orderStatus === "delivered" ? new Date() : null,
        paymentMethod: orderStatus === "delivered" ? (orderCount % 2 === 0 ? "wallet" : "cash") : null,
        paymentStatus: orderStatus === "delivered" ? "success" : null,
        collectedAmount: orderStatus === "delivered" ? totalAmount : null,
        items: { create: items },
      },
    });

    // Wallet debit for delivered wallet orders
    if (orderStatus === "delivered" && orderCount % 2 === 0) {
      await db.customer.update({ where: { id: customerId }, data: { walletBalance: { decrement: totalAmount } } });
      await db.transaction.create({
        data: { customerId, orderId: order.id, type: "auto_debit", method: "wallet", amount: totalAmount, status: "success" },
      });
    }

    orderCount++;
  }
  console.log(`✅ ${orderCount} orders for today`);

  // ── Past 7 days delivery history ──────────────────────────────────────────
  for (let daysAgo = 1; daysAgo <= 7; daysAgo++) {
    const pastDate = new Date(today); pastDate.setDate(pastDate.getDate() - daysAgo);
    for (const [customerId, subs] of groupedSubs) {
      const customer = customers.find(c => c.id === customerId)!;
      const agent = await db.route.findUnique({ where: { id: customer.routeId }, select: { agentId: true } });
      const items = subs.map(s => {
        const p = productMap.get(s.productId)!;
        return { productId: s.productId, quantity: s.quantity, unitPrice: p.pricePerUnit, totalPrice: s.quantity * p.pricePerUnit };
      });
      const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
      const failed = Math.random() < 0.05; // 5% failure rate

      const order = await db.order.create({
        data: {
          customerId, routeId: customer.routeId,
          deliveryAgentId: agent?.agentId ?? null,
          status: failed ? "failed" : "delivered",
          totalAmount, otp: otp(), date: pastDate,
          stopSequence: customer.stopSequence,
          deliveredAt: failed ? null : new Date(pastDate.getTime() + 6 * 3600 * 1000),
          paymentMethod: failed ? null : "wallet",
          paymentStatus: failed ? null : "success",
          collectedAmount: failed ? null : totalAmount,
          items: { create: items },
        },
      });

      if (!failed) {
        await db.transaction.create({
          data: { customerId, orderId: order.id, type: "auto_debit", method: "wallet", amount: totalAmount, status: "success", createdAt: new Date(pastDate.getTime() + 6 * 3600 * 1000) },
        });
      }
    }
  }
  console.log("✅ 7 days delivery history");

  // ── Wallet recharges ──────────────────────────────────────────────────────
  const recharges = [
    { customerId: customers[0].id, amount: 1000 },
    { customerId: customers[2].id, amount: 2000 },
    { customerId: customers[5].id, amount: 500 },
    { customerId: customers[7].id, amount: 5000 },
  ];
  for (const r of recharges) {
    await db.transaction.create({
      data: { customerId: r.customerId, type: "recharge", method: "upi", amount: r.amount, status: "success" },
    });
  }
  console.log("✅ Wallet recharges");

  // ── Inventory ─────────────────────────────────────────────────────────────
  await db.inventory.createMany({
    data: [
      { productId: milk.id,   batchNumber: "B-2261", quantity: 180, capacity: 620, reorderLevel: 200, status: "low" },
      { productId: curd.id,   batchNumber: "B-2258", quantity: 410, capacity: 560, reorderLevel: 100, status: "healthy" },
      { productId: ghee.id,   batchNumber: "B-2240", quantity: 12,  capacity: 140, reorderLevel: 20,  status: "critical" },
      { productId: paneer.id, batchNumber: "B-2241", quantity: 64,  capacity: 140, reorderLevel: 30,  status: "expiring", expiryDate: new Date(Date.now() + 2 * 86400000) },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Inventory (milk: low, ghee: critical, paneer: expiring)");

  // ── Today's attendance for 2 agents ───────────────────────────────────────
  await db.attendance.createMany({
    data: [
      { staffId: agents[0].id, checkIn: new Date(today.getTime() + 5.5 * 3600000), checkInLat: 17.4599, checkInLng: 78.3489, date: today },
      { staffId: agents[1].id, checkIn: new Date(today.getTime() + 5.75 * 3600000), checkOut: new Date(today.getTime() + 10 * 3600000), checkInLat: 17.4414, checkInLng: 78.3840, checkOutLat: 17.4414, checkOutLng: 78.3840, date: today },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Attendance (2 agents checked in today)");

  console.log("\n🎉 Seed complete!\n");
  console.log("── Login credentials ───────────────────────────");
  console.log("Admin portal:    http://localhost:5173/admin-login");
  console.log("  Phone: 9100000000  (OTP: any in dev)");
  console.log("");
  console.log("Customer portal: http://localhost:5173/customer-login");
  console.log("  Meera Reddy:   9800000001");
  console.log("  Vikram Singh:  9800000002");
  console.log("  Priya Das:     9800000008");
  console.log("");
  console.log("Delivery portal: http://localhost:5173/delivery-login");
  console.log("  Suresh Kumar:  9100000001");
  console.log("  Amit Yadav:    9100000002");
  console.log("────────────────────────────────────────────────");
}

seed().catch(console.error).finally(() => db.$disconnect());
