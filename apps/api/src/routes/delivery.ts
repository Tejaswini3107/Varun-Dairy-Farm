import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const deliveryRouter = Router();
deliveryRouter.use(requireAuth);

// GET /delivery/routes — all routes for today
deliveryRouter.get("/routes", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const routes = await db.route.findMany({
      include: {
        agent: { include: { user: { select: { name: true, phone: true } } } },
        orders: {
          where: { date: { gte: today } },
          select: { status: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = routes.map((r) => ({
      id: r.id,
      name: r.name,
      area: r.area,
      agentId: r.agentId,
      agentName: r.agent?.user.name,
      totalStops: r.totalStops,
      completedStops: r.orders.filter((o) => o.status === "delivered").length,
      status: r.status,
    }));

    res.json({ data: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /delivery/my-route — agent's stops for today (falls back to route-based lookup)
deliveryRouter.get("/my-route", async (req: AuthRequest, res, next) => {
  try {
    const staffId = req.user?.staffId;
    if (!staffId) {
      res.status(403).json({ error: "Not a delivery agent" });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find agent's assigned route
    const staffRoute = await db.route.findFirst({ where: { agentId: staffId } });

    const where: any = {
      date: { gte: today, lt: tomorrow },
      status: { notIn: ["cancelled"] },
    };

    // If agent is assigned to a route, show all orders for that route
    // Otherwise, show orders directly assigned to this agent
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

    // Assign sequential stop numbers if missing
    const ordersWithStops = orders.map((o, i) => ({
      ...o,
      stopSequence: o.stopSequence ?? i + 1,
    }));

    const totalCollection = ordersWithStops
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + (o.collectedAmount ?? o.totalAmount), 0);

    res.json({
      data: {
        orders: ordersWithStops,
        route: staffRoute,
        summary: {
          total: ordersWithStops.length,
          done: ordersWithStops.filter((o) => o.status === "delivered").length,
          pending: ordersWithStops.filter((o) => o.status !== "delivered" && o.status !== "failed").length,
          totalCollection,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /delivery/order-otp/:id — DEV ONLY: get OTP for an order
deliveryRouter.get("/order-otp/:id", async (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  try {
    const order = await db.order.findUnique({ where: { id: req.params.id }, select: { otp: true } });
    res.json({ data: { otp: order?.otp ?? null } });
  } catch (err) { next(err); }
});

// PATCH /delivery/routes/:id/start
deliveryRouter.patch("/routes/:id/start", async (req, res, next) => {
  try {
    const route = await db.route.update({
      where: { id: req.params.id },
      data: { status: "in_progress", startedAt: new Date() },
    });
    // Mark all orders as out_for_delivery
    await db.order.updateMany({
      where: { routeId: route.id, status: "assigned" },
      data: { status: "out_for_delivery" },
    });
    res.json({ data: route });
  } catch (err) {
    next(err);
  }
});

// POST /delivery/agent-location — update GPS position
deliveryRouter.post("/agent-location", async (req: AuthRequest, res, next) => {
  try {
    const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
    // In production: publish to Supabase Realtime / Redis pub-sub
    res.json({ data: { lat, lng, agentId: req.user?.staffId } });
  } catch (err) {
    next(err);
  }
});
