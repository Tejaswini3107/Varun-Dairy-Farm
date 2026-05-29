import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth);

// GET /inventory
inventoryRouter.get("/", async (_req, res, next) => {
  try {
    const items = await db.inventory.findMany({
      include: { product: true },
      orderBy: { status: "asc" },
    });
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// GET /inventory/alerts — critical + low + expiring
inventoryRouter.get("/alerts", async (_req, res, next) => {
  try {
    const alerts = await db.inventory.findMany({
      where: { status: { in: ["critical", "low", "expiring"] } },
      include: { product: true },
      orderBy: { status: "asc" },
    });
    res.json({ data: alerts });
  } catch (err) {
    next(err);
  }
});

// POST /inventory — purchase entry
inventoryRouter.post("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      productId: z.string(),
      batchNumber: z.string(),
      quantity: z.number().positive(),
      capacity: z.number().positive(),
      expiryDate: z.string().optional(),
      reorderLevel: z.number().positive(),
    });

    const data = schema.parse(req.body);
    const item = await db.inventory.create({
      data: {
        ...data,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        status: data.quantity / data.capacity < 0.1 ? "critical" : data.quantity / data.capacity < 0.3 ? "low" : "healthy",
      },
      include: { product: true },
    });
    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
});

// PATCH /inventory/:id
inventoryRouter.patch("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { quantity } = z.object({ quantity: z.number().positive() }).parse(req.body);
    const existing = await db.inventory.findUniqueOrThrow({ where: { id: req.params.id } });

    const newQty = existing.quantity + quantity;
    const ratio = newQty / existing.capacity;
    const status = ratio < 0.1 ? "critical" : ratio < 0.3 ? "low" : "healthy";

    const item = await db.inventory.update({
      where: { id: req.params.id },
      data: { quantity: newQty, status },
      include: { product: true },
    });
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

// POST /inventory/spoilage
inventoryRouter.post("/spoilage", requireRole("admin", "manager", "delivery_staff"), async (req, res, next) => {
  try {
    const schema = z.object({
      productId: z.string(),
      quantity: z.number().positive(),
      reason: z.string(),
      valueLost: z.number().positive(),
    });

    const data = schema.parse(req.body);
    const log = await db.spoilageLog.create({
      data: { ...data, loggedById: (req as any).user.id },
      include: { product: true },
    });
    res.status(201).json({ data: log });
  } catch (err) {
    next(err);
  }
});
