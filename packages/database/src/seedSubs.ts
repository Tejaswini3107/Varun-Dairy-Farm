import { db } from "./client";

async function addSubs() {
  const subData = [
    { phone: "9800000012", subs: [{ productId: "prod_milk", quantity: 3, frequency: "daily" as const }, { productId: "prod_curd", quantity: 1, frequency: "daily" as const }] },
    { phone: "9900000004", subs: [{ productId: "prod_milk", quantity: 3, frequency: "daily" as const }] },
    { phone: "9700000088", subs: [{ productId: "prod_paneer", quantity: 1, frequency: "weekly" as const }] },
    { phone: "9600000051", subs: [{ productId: "prod_milk", quantity: 1, frequency: "daily" as const }] },
    { phone: "9000000033", subs: [{ productId: "prod_milk", quantity: 2, frequency: "daily" as const }, { productId: "prod_curd", quantity: 1, frequency: "daily" as const }] },
  ];

  let count = 0;
  for (const sd of subData) {
    const user = await db.user.findUnique({ where: { phone: sd.phone } });
    if (!user) { console.log(`User ${sd.phone} not found`); continue; }
    const customer = await db.customer.findUnique({ where: { userId: user.id } });
    if (!customer) { console.log(`Customer not found`); continue; }

    for (const sub of sd.subs) {
      const existing = await db.subscription.findFirst({ where: { customerId: customer.id, productId: sub.productId } });
      if (!existing) {
        await db.subscription.create({ data: { customerId: customer.id, productId: sub.productId, quantity: sub.quantity, frequency: sub.frequency, status: "active" } });
        count++;
        console.log(`  ✅ ${user.name}: ${sub.productId} ×${sub.quantity} (${sub.frequency})`);
      } else {
        console.log(`  ⏭ Already exists: ${user.name} ${sub.productId}`);
      }
    }
  }
  console.log(`\n✅ ${count} subscriptions created`);
  await db.$disconnect();
}

addSubs().catch(e => { console.error(e); process.exit(1); });
