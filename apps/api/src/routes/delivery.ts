import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { sendPushNotification } from "../services/notifications";

export const deliveryRouter = Router();
deliveryRouter.use(requireAuth);

// ── Route CRUD ────────────────────────────────────────────────────────────────

// GET /delivery/routes
deliveryRouter.get("/routes", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await db.route.findMany({
      include: {
        agent: { include: { user: { select: { name: true, phone: true } } } },
        orders: {
          where: { date: { gte: today, lt: tomorrow } },
          select: { status: true, totalAmount: true },
        },
        customers: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    const enriched = routes.map((r) => {
      const todayOrders = r.orders;
      const delivered = todayOrders.filter(o => o.status === "delivered").length;
      const total = todayOrders.length;
      const collection = todayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        id: r.id,
        name: r.name,
        area: r.area,
        agentId: r.agentId,
        agentName: r.agent?.user.name ?? null,
        agentPhone: r.agent?.user.phone ?? null,
        customerCount: r.customers.length,
        totalStops: total,
        completedStops: delivered,
        todayCollection: collection,
        status: r.status,
        startedAt: r.startedAt,
      };
    });

    res.json({ data: enriched });
  } catch (err) { next(err); }
});

// POST /delivery/routes — create a new route
deliveryRouter.post("/routes", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      area: z.string().min(2),
      agentId: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const route = await db.route.create({
      data,
      include: { agent: { include: { user: { select: { name: true } } } } },
    });
    res.status(201).json({ data: route });
  } catch (err) { next(err); }
});

// PATCH /delivery/routes/:id — update name, area, or default agent
deliveryRouter.patch("/routes/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      area: z.string().min(2).optional(),
      agentId: z.string().nullable().optional(),
    });
    const data = schema.parse(req.body);
    const route = await db.route.update({
      where: { id: req.params.id },
      data,
      include: { agent: { include: { user: { select: { name: true } } } } },
    });
    res.json({ data: route });
  } catch (err) { next(err); }
});

// DELETE /delivery/routes/:id — only if no active orders today
deliveryRouter.delete("/routes/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const active = await db.order.count({
      where: { routeId: req.params.id, date: { gte: today }, status: { in: ["pending", "assigned", "out_for_delivery"] } },
    });
    if (active > 0) {
      res.status(400).json({ error: `Cannot delete — ${active} active orders today. Reassign them first.` });
      return;
    }
    await db.route.delete({ where: { id: req.params.id } });
    res.json({ message: "Route deleted" });
  } catch (err) { next(err); }
});

// POST /delivery/routes/auto-assign — assign each route's default agent to today's orders
deliveryRouter.post("/routes/auto-assign", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await db.route.findMany({ where: { agentId: { not: null } } });

    let assigned = 0;
    for (const route of routes) {
      if (!route.agentId) continue;

      await db.route.update({
        where: { id: route.id },
        data: { status: "not_started", startedAt: null, completedAt: null, completedStops: 0 },
      });

      const result = await db.order.updateMany({
        where: { routeId: route.id, date: { gte: today, lt: tomorrow }, status: "pending" },
        data: { deliveryAgentId: route.agentId, status: "assigned" },
      });
      assigned += result.count;

      // Push notification to the assigned agent
      const staff = await db.staff.findUnique({
        where: { id: route.agentId },
        include: { user: { select: { name: true, fcmToken: true } } },
      });
      if (staff?.user.fcmToken) {
        sendPushNotification(staff.user.fcmToken, {
          title: "Route assigned 🛵",
          body: `${route.name} · ${result.count} deliveries ready. Tap to start.`,
        }, { routeId: route.id }).catch(() => {});
      }
    }

    res.json({ message: `Auto-assigned ${assigned} orders across ${routes.length} routes` });
  } catch (err) { next(err); }
});

// PATCH /delivery/routes/:id/assign-agent — set default agent + assign today's orders
deliveryRouter.patch("/routes/:id/assign-agent", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { agentId } = z.object({ agentId: z.string() }).parse(req.body);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    // If this agent is on another route, clear that
    await db.route.updateMany({ where: { agentId, id: { not: req.params.id } }, data: { agentId: null } });

    await db.route.update({ where: { id: req.params.id }, data: { agentId } });

    // Assign today's pending/assigned orders to this agent
    await db.order.updateMany({
      where: { routeId: req.params.id, date: { gte: today, lt: tomorrow }, status: { in: ["pending", "assigned"] } },
      data: { deliveryAgentId: agentId, status: "assigned" },
    });

    const route = await db.route.findUnique({
      where: { id: req.params.id },
      include: { agent: { include: { user: { select: { name: true, phone: true, fcmToken: true } } } } },
    });

    // Push notification to newly assigned agent
    if (route?.agent?.user.fcmToken) {
      const orderCount = await db.order.count({
        where: { routeId: req.params.id, date: { gte: today, lt: tomorrow }, status: "assigned" },
      });
      sendPushNotification(route.agent.user.fcmToken, {
        title: "Route assigned 🛵",
        body: `${route.name} · ${orderCount} deliveries ready. Tap to start.`,
      }, { routeId: route.id }).catch(() => {});
    }

    res.json({ data: route });
  } catch (err) { next(err); }
});

// PATCH /delivery/routes/:id/start
deliveryRouter.patch("/routes/:id/start", async (req, res, next) => {
  try {
    const route = await db.route.update({
      where: { id: req.params.id },
      data: { status: "in_progress", startedAt: new Date() },
    });
    await db.order.updateMany({
      where: { routeId: route.id, status: "assigned" },
      data: { status: "out_for_delivery" },
    });
    res.json({ data: route });
  } catch (err) { next(err); }
});

// GET /delivery/routes/:id/orders — admin drill-down: all today's orders for a route
deliveryRouter.get("/routes/:id/orders", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await db.order.findMany({
      where: { routeId: req.params.id, date: { gte: today, lt: tomorrow }, status: { not: "cancelled" } },
      include: {
        customer: {
          include: { user: { select: { name: true, phone: true } } },
        },
        items: { include: { product: { select: { name: true } } } },
        deliveryAgent: { include: { user: { select: { name: true } } } },
      },
      orderBy: { stopSequence: "asc" },
    });

    const mapped = orders.map(o => ({
      id: o.id,
      stopSequence: o.stopSequence,
      status: o.status,
      customerName: o.customer.user.name,
      customerPhone: o.customer.user.phone,
      address: o.customer.address,
      totalAmount: o.totalAmount,
      collectedAmount: o.collectedAmount,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      deliveredAt: o.deliveredAt,
      agentName: o.deliveryAgent?.user.name ?? null,
      items: o.items.map(i => `${i.product.name} ×${i.quantity}`),
    }));

    res.json({ data: mapped });
  } catch (err) { next(err); }
});

// PATCH /delivery/orders/:id/admin-status — admin manually override order status
deliveryRouter.patch("/orders/:id/admin-status", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { status, collectedAmount, paymentMethod } = z.object({
      status: z.enum(["pending", "assigned", "out_for_delivery", "delivered", "failed", "cancelled"]),
      collectedAmount: z.number().optional(),
      paymentMethod: z.enum(["wallet", "upi", "cash", "razorpay"]).optional(),
    }).parse(req.body);

    const order = await db.order.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(collectedAmount !== undefined ? { collectedAmount } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
      },
      include: { route: true },
    });

    // Update route completedStops count
    if (order.routeId) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const done = await db.order.count({ where: { routeId: order.routeId, date: { gte: today, lt: tomorrow }, status: "delivered" } });
      await db.route.update({ where: { id: order.routeId }, data: { completedStops: done } });
    }

    res.json({ data: order });
  } catch (err) { next(err); }
});

// ── Agent-facing ──────────────────────────────────────────────────────────────

// GET /delivery/my-route
deliveryRouter.get("/my-route", async (req: AuthRequest, res, next) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) { res.status(403).json({ error: "Not a delivery agent" }); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const staffRoute = await db.route.findFirst({ where: { agentId: staffId } });

    const where: any = { date: { gte: today, lt: tomorrow }, status: { notIn: ["cancelled"] } };
    if (staffRoute) {
      where.routeId = staffRoute.id;
    } else {
      where.deliveryAgentId = staffId;
    }

    const orders = await db.order.findMany({
      where,
      include: {
        customer: {
          include: {
            user: { select: { name: true, phone: true } },
            route: { select: { name: true, area: true } },
          },
        },
        items: { include: { product: true } },
      },
      orderBy: [{ stopSequence: "asc" }, { createdAt: "asc" }],
    });

    const ordersWithStops = orders.map((o, i) => ({ ...o, stopSequence: o.stopSequence ?? i + 1 }));
    const totalCollection = ordersWithStops
      .filter(o => o.status === "delivered")
      .reduce((sum, o) => sum + (o.collectedAmount ?? o.totalAmount), 0);

    res.json({
      data: {
        orders: ordersWithStops,
        route: staffRoute,
        summary: {
          total: ordersWithStops.length,
          done: ordersWithStops.filter(o => o.status === "delivered").length,
          pending: ordersWithStops.filter(o => o.status !== "delivered" && o.status !== "failed").length,
          totalCollection,
        },
      },
    });
  } catch (err) { next(err); }
});

// GET /delivery/order-otp/:id — DEV ONLY
deliveryRouter.get("/order-otp/:id", async (req, res, next) => {
  if (process.env.NODE_ENV !== "development") { res.status(404).json({ error: "Not found" }); return; }
  try {
    const order = await db.order.findUnique({ where: { id: req.params.id }, select: { otp: true } });
    res.json({ data: { otp: order?.otp ?? null } });
  } catch (err) { next(err); }
});

// POST /delivery/agent-location
deliveryRouter.post("/agent-location", async (req: AuthRequest, res, next) => {
  try {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    res.json({ data: { lat, lng, agentId: req.user?.staffId } });
  } catch (err) { next(err); }
});

// ── Attendance ────────────────────────────────────────────────────────────────

// POST /delivery/attendance/check-in
deliveryRouter.post("/attendance/check-in", async (req: AuthRequest, res, next) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) { res.status(403).json({ error: "Not a delivery agent" }); return; }

    const { lat, lng } = z.object({ lat: z.number().optional(), lng: z.number().optional() }).parse(req.body);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    // Prevent duplicate check-in for today
    const existing = await db.attendance.findFirst({ where: { staffId, date: { gte: today, lt: tomorrow } } });
    if (existing) {
      res.json({ data: existing, alreadyCheckedIn: true });
      return;
    }

    const attendance = await db.attendance.create({
      data: { staffId, checkIn: new Date(), checkInLat: lat, checkInLng: lng },
    });

    // Mark staff as on_road
    await db.staff.update({ where: { id: staffId }, data: { status: "on_road" } });

    res.status(201).json({ data: attendance });
  } catch (err) { next(err); }
});

// POST /delivery/attendance/check-out
deliveryRouter.post("/attendance/check-out", async (req: AuthRequest, res, next) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) { res.status(403).json({ error: "Not a delivery agent" }); return; }

    const { lat, lng } = z.object({ lat: z.number().optional(), lng: z.number().optional() }).parse(req.body);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await db.attendance.findFirst({ where: { staffId, date: { gte: today, lt: tomorrow } } });
    if (!existing) { res.status(400).json({ error: "Not checked in today" }); return; }
    if (existing.checkOut) { res.json({ data: existing, alreadyCheckedOut: true }); return; }

    const attendance = await db.attendance.update({
      where: { id: existing.id },
      data: { checkOut: new Date(), checkOutLat: lat, checkOutLng: lng },
    });

    await db.staff.update({ where: { id: staffId }, data: { status: "completed" } });

    res.json({ data: attendance });
  } catch (err) { next(err); }
});

// GET /delivery/attendance/today — logged-in agent's attendance for today
deliveryRouter.get("/attendance/today", async (req: AuthRequest, res, next) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) { res.status(403).json({ error: "Not a delivery agent" }); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await db.attendance.findFirst({ where: { staffId, date: { gte: today, lt: tomorrow } } });
    res.json({ data: attendance ?? null });
  } catch (err) { next(err); }
});

// GET /delivery/attendance — admin view (all staff, date range)
deliveryRouter.get("/attendance", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { date, staffId } = req.query as Record<string, string>;
    const where: any = {};
    if (staffId) where.staffId = staffId;
    if (date) {
      const d = new Date(date); d.setHours(0, 0, 0, 0);
      const dn = new Date(d); dn.setDate(dn.getDate() + 1);
      where.date = { gte: d, lt: dn };
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      where.date = { gte: today, lt: tomorrow };
    }

    const records = await db.attendance.findMany({
      where,
      include: { staff: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: { checkIn: "asc" },
    });

    res.json({ data: records });
  } catch (err) { next(err); }
});

// ── Delivery proof ────────────────────────────────────────────────────────────

// POST /delivery/orders/:id/proof — save base64 photo as delivery proof
deliveryRouter.post("/orders/:id/proof", async (req: AuthRequest, res, next) => {
  try {
    const { imageBase64 } = z.object({ imageBase64: z.string().min(10) }).parse(req.body);

    // Validate it looks like a base64 image
    if (!imageBase64.startsWith("data:image/")) {
      res.status(400).json({ error: "imageBase64 must be a data URL (data:image/...)" });
      return;
    }

    const order = await db.order.update({
      where: { id: req.params.id },
      data: { proofImageUrl: imageBase64 },
      select: { id: true, proofImageUrl: true },
    });

    res.json({ data: order });
  } catch (err) { next(err); }
});
