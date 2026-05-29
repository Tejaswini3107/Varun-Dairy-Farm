import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";
import { generateDailyOrders } from "../services/orderGeneration";
import { sendPushNotification } from "../services/notifications";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// GET /orders — list with filters
ordersRouter.get("/", async (req, res, next) => {
  try {
    const { status, routeId, agentId, date, page = "1", pageSize = "50" } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;
    if (routeId) where.routeId = routeId;
    if (agentId) where.deliveryAgentId = agentId;
    if (date) {
      const d = new Date(date);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          customer: { include: { user: { select: { name: true, phone: true } } } },
          items: { include: { product: true } },
          deliveryAgent: { include: { user: { select: { name: true } } } },
        },
        skip,
        take: parseInt(pageSize),
        orderBy: [{ stopSequence: "asc" }, { createdAt: "desc" }],
      }),
      db.order.count({ where }),
    ]);

    res.json({ data: orders, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) });
  } catch (err) {
    next(err);
  }
});

// GET /orders/today — today's summary grouped by status
ordersRouter.get("/today", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await db.order.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: {
        customer: { include: { user: { select: { name: true } } } },
        items: { include: { product: true } },
      },
    });

    const grouped = {
      pending: orders.filter((o) => o.status === "pending"),
      assigned: orders.filter((o) => o.status === "assigned"),
      out_for_delivery: orders.filter((o) => o.status === "out_for_delivery"),
      delivered: orders.filter((o) => o.status === "delivered"),
      failed: orders.filter((o) => o.status === "failed"),
    };

    res.json({ data: grouped, total: orders.length });
  } catch (err) {
    next(err);
  }
});

// POST /orders/generate — trigger daily order generation (normally cron)
ordersRouter.post("/generate", requireRole("admin", "manager"), async (_req, res, next) => {
  try {
    const count = await generateDailyOrders();
    res.json({ message: `Generated ${count} orders`, count });
  } catch (err) {
    next(err);
  }
});

// POST /orders/generate-for-customer — generate today's order for a single customer
ordersRouter.post("/generate-for-customer", async (req: any, res, next) => {
  try {
    // Accept customerId from body OR fall back to JWT claim (so customer portal works with JWT alone)
    const bodyId = req.body?.customerId;
    const jwtId = req.user?.customerId;
    const customerId = bodyId ?? jwtId;
    if (!customerId) {
      res.status(400).json({ error: "customerId required" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await db.order.findFirst({ where: { customerId, date: { gte: today, lt: tomorrow } } });
    if (existing) {
      const full = await db.order.findUnique({
        where: { id: existing.id },
        include: { items: { include: { product: true } }, customer: { include: { user: { select: { name: true } } } } },
      });
      res.json({ data: full, created: false });
      return;
    }

    const subs = await db.subscription.findMany({
      where: { customerId, status: "active" },
      include: { product: true, customer: true },
    });

    if (!subs.length) { res.status(400).json({ error: "No active subscriptions" }); return; }

    const items = subs.map(s => ({
      productId: s.productId,
      quantity: s.quantity,
      unitPrice: s.product.pricePerUnit,
      totalPrice: s.quantity * s.product.pricePerUnit,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const otp = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join("");

    const order = await db.order.create({
      data: { customerId, routeId: subs[0].customer.routeId, totalAmount, otp, date: today, items: { create: items } },
      include: { items: { include: { product: true } }, customer: { include: { user: { select: { name: true } } } } },
    });

    res.status(201).json({ data: order, created: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /orders/:id/assign — assign order to a delivery agent
ordersRouter.patch("/:id/assign", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { deliveryAgentId } = z.object({ deliveryAgentId: z.string() }).parse(req.body);
    const order = await db.order.update({
      where: { id: req.params.id },
      data: { deliveryAgentId, status: "assigned" },
      include: { customer: { include: { user: { select: { name: true } } } }, items: { include: { product: true } } },
    });
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

// PATCH /orders/:id/status — update order status
ordersRouter.patch("/:id/status", async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(["pending", "assigned", "out_for_delivery", "delivered", "failed", "cancelled"]),
      collectedAmount: z.number().optional(),
      paymentMethod: z.enum(["wallet", "upi", "cash", "razorpay"]).optional(),
      proofImageUrl: z.string().optional(),
      otp: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const order = await db.order.update({
      where: { id: req.params.id },
      data: {
        ...data,
        deliveredAt: data.status === "delivered" ? new Date() : undefined,
        paymentStatus: data.status === "delivered" && data.collectedAmount ? "success" : undefined,
      },
      include: {
        customer: { include: { user: { select: { name: true, fcmToken: true } } } },
        items: { include: { product: true } },
      },
    });

    // Debit wallet if delivered and paid via wallet
    if (data.status === "delivered" && data.paymentMethod === "wallet") {
      await db.customer.update({
        where: { id: order.customerId },
        data: { walletBalance: { decrement: order.totalAmount } },
      });
      await db.transaction.create({
        data: {
          customerId: order.customerId,
          orderId: order.id,
          type: "auto_debit",
          method: "wallet",
          amount: order.totalAmount,
          status: "success",
        },
      });
    }

    // Push notification to customer
    if (data.status === "delivered" && order.customer.user.fcmToken) {
      await sendPushNotification(order.customer.user.fcmToken, {
        title: "Delivery complete 🥛",
        body: `Your order has been delivered. ₹${order.totalAmount} debited.`,
      }).catch(() => {});
    }

    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

// POST /orders/:id/verify-otp
ordersRouter.post("/:id/verify-otp", async (req, res, next) => {
  try {
    const { otp } = z.object({ otp: z.string().length(4) }).parse(req.body);
    const order = await db.order.findUniqueOrThrow({ where: { id: req.params.id } });

    if (order.otp !== otp) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }
    res.json({ data: { verified: true } });
  } catch (err) {
    next(err);
  }
});
