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

// GET /delivery/my-route — agent's stops for today
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

    const orders = await db.order.findMany({
      where: {
        deliveryAgentId: staffId,
        date: { gte: today, lt: tomorrow },
        status: { notIn: ["cancelled"] },
      },
      include: {
        customer: {
          include: {
            user: { select: { name: true, phone: true } },
            route: { select: { name: true } },
          },
        },
        items: { include: { product: true } },
      },
      orderBy: { stopSequence: "asc" },
    });

    const totalCollection = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + (o.collectedAmount ?? o.totalAmount), 0);

    res.json({
      data: {
        orders,
        summary: {
          total: orders.length,
          done: orders.filter((o) => o.status === "delivered").length,
          pending: orders.filter((o) => o.status !== "delivered" && o.status !== "failed").length,
          totalCollection,
        },
      },
    });
  } catch (err) {
    next(err);
  }
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
