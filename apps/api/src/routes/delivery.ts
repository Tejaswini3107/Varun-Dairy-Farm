import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

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

      // Reset route status for new day
      await db.route.update({
        where: { id: route.id },
        data: { status: "not_started", startedAt: null, completedAt: null, completedStops: 0 },
      });

      // Assign pending orders for this route to the default agent
      const result = await db.order.updateMany({
        where: {
          routeId: route.id,
          date: { gte: today, lt: tomorrow },
          status: "pending",
        },
        data: { deliveryAgentId: route.agentId, status: "assigned" },
      });

      assigned += result.count;
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
      include: { agent: { include: { user: { select: { name: true, phone: true } } } } },
    });
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
