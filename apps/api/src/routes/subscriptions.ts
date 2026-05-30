import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { recalculateOrderForCustomer } from "../services/orderGeneration";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

// GET /subscriptions/my
subscriptionsRouter.get("/my", async (req: AuthRequest, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) { res.status(403).json({ error: "Not a customer" }); return; }
    const subs = await db.subscription.findMany({
      where: { customerId },
      include: { product: true },
    });
    res.json({ data: subs });
  } catch (err) { next(err); }
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

    // Upsert: if a subscription for this customer+product already exists, reactivate
    // and update it rather than creating a duplicate.
    const existing = await db.subscription.findFirst({
      where: { customerId: data.customerId, productId: data.productId },
    });

    let sub;
    if (existing) {
      sub = await db.subscription.update({
        where: { id: existing.id },
        data: {
          quantity: data.quantity,
          frequency: data.frequency,
          status: "active",
          pauseUntil: null,
          vacationFrom: null,
          vacationUntil: null,
        },
        include: { product: true },
      });
    } else {
      sub = await db.subscription.create({ data, include: { product: true } });
    }

    recalculateOrderForCustomer(data.customerId).catch(console.error);
    res.status(existing ? 200 : 201).json({ data: sub });
  } catch (err) { next(err); }
});

// POST /subscriptions/deduplicate — merge duplicate customer+product subscriptions (keep latest active)
subscriptionsRouter.post("/deduplicate", async (req: AuthRequest, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) { res.status(403).json({ error: "Not a customer" }); return; }

    const all = await db.subscription.findMany({ where: { customerId }, orderBy: { createdAt: "asc" } });
    const seen = new Map<string, string>(); // productId -> id to keep
    const toDelete: string[] = [];

    for (const s of all) {
      if (seen.has(s.productId)) {
        // Keep the one with status=active if possible, otherwise keep the newer one
        const keepId = seen.get(s.productId)!;
        const keep = all.find(x => x.id === keepId)!;
        if (s.status === "active" && keep.status !== "active") {
          toDelete.push(keepId);
          seen.set(s.productId, s.id);
        } else {
          toDelete.push(s.id);
        }
      } else {
        seen.set(s.productId, s.id);
      }
    }

    if (toDelete.length > 0) {
      await db.subscription.deleteMany({ where: { id: { in: toDelete } } });
    }

    const remaining = await db.subscription.findMany({ where: { customerId }, include: { product: true } });
    res.json({ removed: toDelete.length, data: remaining });
  } catch (err) { next(err); }
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

    // Sync: subscription changed → recalculate today's order in background
    recalculateOrderForCustomer(sub.customerId).catch(console.error);

    res.json({ data: sub });
  } catch (err) { next(err); }
});
