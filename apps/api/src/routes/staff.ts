import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole("admin", "manager"));

// GET /staff
staffRouter.get("/", async (_req, res, next) => {
  try {
    const staff = await db.staff.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        routes: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { name: true, area: true, totalStops: true, completedStops: true },
        },
      },
    });

    const enriched = await Promise.all(
      staff.map(async (s) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [deliveries, collections] = await Promise.all([
          db.order.count({ where: { deliveryAgentId: s.id, status: "delivered", date: { gte: today } } }),
          db.transaction.aggregate({
            where: { createdAt: { gte: today }, order: { deliveryAgentId: s.id }, status: "success" },
            _sum: { amount: true },
          }),
        ]);

        return {
          id: s.id,
          name: s.user.name,
          phone: s.user.phone,
          role: s.role,
          status: s.status,
          routeName: s.routes[0]?.name,
          routeArea: s.routes[0]?.area,
          totalStops: s.routes[0]?.totalStops ?? 0,
          completedDeliveries: deliveries,
          totalCollection: collections._sum.amount ?? 0,
          joinedAt: s.joinedAt,
        };
      })
    );

    res.json({ data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /staff
staffRouter.post("/", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      phone: z.string().regex(/^[6-9]\d{9}$/),
      role: z.enum(["manager", "delivery_agent"]).default("delivery_agent"),
    });

    const data = schema.parse(req.body);
    const user = await db.user.create({
      data: { name: data.name, phone: data.phone, role: "delivery_staff" },
    });
    const staff = await db.staff.create({
      data: { userId: user.id, role: data.role },
      include: { user: true },
    });
    res.status(201).json({ data: staff });
  } catch (err) {
    next(err);
  }
});

// PATCH /staff/:id/assign-route
staffRouter.patch("/:id/assign-route", async (req, res, next) => {
  try {
    const { routeId } = z.object({ routeId: z.string() }).parse(req.body);
    // Unassign previous route for this agent
    await db.route.updateMany({ where: { agentId: req.params.id }, data: { agentId: null } });
    // Assign new route
    await db.route.update({ where: { id: routeId }, data: { agentId: req.params.id, status: "in_progress" } });
    // Assign all today's orders on this route to agent
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.order.updateMany({
      where: { routeId, status: { in: ["pending", "assigned"] }, date: { gte: today } },
      data: { deliveryAgentId: req.params.id, status: "out_for_delivery" },
    });
    res.json({ message: "Route assigned and orders dispatched" });
  } catch (err) {
    next(err);
  }
});

// GET /staff/routes — all routes with agent assignments
staffRouter.get("/routes", async (_req, res, next) => {
  try {
    const routes = await db.route.findMany({
      include: { agent: { include: { user: { select: { name: true } } } } },
      orderBy: { name: "asc" },
    });
    res.json({ data: routes });
  } catch (err) { next(err); }
});
