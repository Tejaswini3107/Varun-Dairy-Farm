import { db } from "@varun/database";
import { OTP_LENGTH } from "@varun/shared";

function generateOtp() {
  return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join("");
}

export async function generateDailyOrders(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all active subscriptions
  const subscriptions = await db.subscription.findMany({
    where: {
      status: "active",
      OR: [
        { pauseUntil: null },
        { pauseUntil: { lt: today } },
      ],
    },
    include: {
      customer: true,
      product: true,
    },
  });

  // Group by customer
  const customerMap = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    if (!customerMap.has(sub.customerId)) customerMap.set(sub.customerId, []);
    customerMap.get(sub.customerId)!.push(sub);
  }

  let count = 0;

  for (const [customerId, subs] of customerMap) {
    const customer = subs[0].customer;

    // Check if order already exists for today
    const existing = await db.order.findFirst({
      where: { customerId, date: { gte: today } },
    });
    if (existing) continue;

    const items = subs.map((sub) => ({
      productId: sub.productId,
      quantity: sub.quantity,
      unitPrice: sub.product.pricePerUnit,
      totalPrice: sub.quantity * sub.product.pricePerUnit,
    }));

    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    await db.order.create({
      data: {
        customerId,
        routeId: customer.routeId,
        totalAmount,
        otp: generateOtp(),
        date: today,
        items: { create: items },
      },
    });

    count++;
  }

  console.log(`✅ Generated ${count} orders for ${today.toDateString()}`);
  return count;
}
