import { db } from "@varun/database";
import { OTP_LENGTH } from "@varun/shared";
import { shouldDeliverOn, computeNextDeliveryDate } from "./subscriptionUtils";

function generateOtp() {
  return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10)).join("");
}

export async function generateDailyOrders(targetDate?: Date): Promise<number> {
  const today = targetDate ?? new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const subscriptions = await db.subscription.findMany({
    where: {
      status: "active",
      OR: [{ pauseUntil: null }, { pauseUntil: { lt: today } }],
    },
    include: { customer: true, product: true },
  });

  const customerMap = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    if (!shouldDeliverOn(sub.frequency, sub.createdAt, today)) continue;
    if (!customerMap.has(sub.customerId)) customerMap.set(sub.customerId, []);
    customerMap.get(sub.customerId)!.push(sub);
  }

  let count = 0;

  for (const [customerId, subs] of customerMap) {
    const customer = subs[0].customer;

    const existing = await db.order.findFirst({
      where: { customerId, date: { gte: today, lt: tomorrow } },
    });
    if (existing) continue;

    const items = subs.map((sub) => ({
      productId: sub.productId,
      quantity: sub.quantity,
      unitPrice: sub.product.pricePerUnit,
      totalPrice: sub.quantity * sub.product.pricePerUnit,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    // If the route has a default agent, assign immediately
    const route = await db.route.findUnique({ where: { id: customer.routeId }, select: { agentId: true } });
    await db.order.create({
      data: {
        customerId,
        routeId: customer.routeId,
        totalAmount,
        otp: generateOtp(),
        date: today,
        status: route?.agentId ? "assigned" : "pending",
        deliveryAgentId: route?.agentId ?? null,
        items: { create: items },
      },
    });

    await Promise.all(
      subs.map((sub) =>
        db.subscription.update({
          where: { id: sub.id },
          data: { nextDeliveryDate: computeNextDeliveryDate(sub.frequency, today) },
        })
      )
    );

    count++;
  }

  console.log(`✅ Generated ${count} orders for ${today.toDateString()}`);
  return count;
}

/**
 * Recalculates today's order for a single customer from their current active
 * subscriptions. Only touches orders still in pending/assigned state — never
 * modifies an order that is already out for delivery or delivered.
 *
 * Called automatically after any subscription change so every downstream
 * system (admin portal, delivery app, inventory forecast) stays consistent.
 */
export async function recalculateOrderForCustomer(customerId: string): Promise<any | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [customer, allSubs, existing] = await Promise.all([
    db.customer.findUnique({ where: { id: customerId } }),
    db.subscription.findMany({
      where: {
        customerId,
        status: "active",
        OR: [{ pauseUntil: null }, { pauseUntil: { lt: today } }],
      },
      include: { product: true },
    }),
    db.order.findFirst({
      where: {
        customerId,
        date: { gte: today, lt: tomorrow },
        status: { in: ["pending", "assigned", "out_for_delivery"] },
      },
    }),
  ]);

  if (!customer) return null;

  const subs = allSubs.filter(s => shouldDeliverOn(s.frequency, s.createdAt, today));

  if (existing) {
    if (subs.length === 0) {
      // No active deliveries today — cancel the pending order
      return db.order.update({
        where: { id: existing.id },
        data: { status: "cancelled" },
        include: { items: { include: { product: true } } },
      });
    }

    // Swap out items in-place, preserve agent assignment and OTP
    await db.orderItem.deleteMany({ where: { orderId: existing.id } });
    const items = subs.map(s => ({
      productId: s.productId,
      quantity: s.quantity,
      unitPrice: s.product.pricePerUnit,
      totalPrice: s.quantity * s.product.pricePerUnit,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    return db.order.update({
      where: { id: existing.id },
      data: { totalAmount, items: { create: items } },
      include: {
        items: { include: { product: true } },
        customer: { include: { user: { select: { name: true } } } },
        deliveryAgent: { include: { user: { select: { name: true } } } },
      },
    });
  }

  if (subs.length === 0) return null;

  // No order yet today — create one, auto-assign if route has an agent
  const items = subs.map(s => ({
    productId: s.productId,
    quantity: s.quantity,
    unitPrice: s.product.pricePerUnit,
    totalPrice: s.quantity * s.product.pricePerUnit,
  }));
  const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const route = await db.route.findUnique({ where: { id: customer.routeId }, select: { agentId: true } });

  return db.order.create({
    data: {
      customerId,
      routeId: customer.routeId,
      totalAmount,
      otp: generateOtp(),
      date: today,
      status: route?.agentId ? "assigned" : "pending",
      deliveryAgentId: route?.agentId ?? null,
      items: { create: items },
    },
    include: {
      items: { include: { product: true } },
      customer: { include: { user: { select: { name: true } } } },
      deliveryAgent: { include: { user: { select: { name: true } } } },
    },
  });
}
