import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

// GET /subscriptions — customer's own subscriptions
subscriptionsRouter.get("/my", async (req: AuthRequest, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) {
      res.status(403).json({ error: "Not a customer" });
      return;
    }

    const subs = await db.subscription.findMany({
      where: { customerId },
      include: { product: true },
    });
    res.json({ data: subs });
  } catch (err) {
    next(err);
  }
});

// POST /subscriptions
subscriptionsRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      customerId: z.string(),
      productId: z.string(),
      quantity: z.number().positive(),
      frequency: z.enum(["daily", "alternate", "weekly", "monthly"]).default("daily"),
    });

    const data = schema.parse(req.body);
    const sub = await db.subscription.create({
      data,
      include: { product: true },
    });
    res.status(201).json({ data: sub });
  } catch (err) {
    next(err);
  }
});

// PATCH /subscriptions/:id
subscriptionsRouter.patch("/:id", async (req, res, next) => {
  try {
    const schema = z.object({
      quantity: z.number().positive().optional(),
      status: z.enum(["active", "paused", "vacation", "cancelled"]).optional(),
      pauseUntil: z.string().optional(),
      vacationFrom: z.string().optional(),
      vacationUntil: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const sub = await db.subscription.update({
      where: { id: req.params.id },
      data: {
        ...data,
        pauseUntil: data.pauseUntil ? new Date(data.pauseUntil) : undefined,
        vacationFrom: data.vacationFrom ? new Date(data.vacationFrom) : undefined,
        vacationUntil: data.vacationUntil ? new Date(data.vacationUntil) : undefined,
      },
      include: { product: true },
    });
    res.json({ data: sub });
  } catch (err) {
    next(err);
  }
});
