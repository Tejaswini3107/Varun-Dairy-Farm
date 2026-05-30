import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";

export const productsRouter = Router();
productsRouter.use(requireAuth);

// GET /products
productsRouter.get("/", async (_req, res, next) => {
  try {
    const products = await db.product.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { subscriptions: true } },
      },
    });
    res.json({ data: products });
  } catch (err) { next(err); }
});

// POST /products
productsRouter.post("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      category: z.enum(["milk", "curd", "ghee", "paneer", "other"]),
      unit: z.string().min(1),
      pricePerUnit: z.number().positive(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const product = await db.product.create({ data });
    res.status(201).json({ data: product });
  } catch (err) { next(err); }
});

// PATCH /products/:id
productsRouter.patch("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      category: z.enum(["milk", "curd", "ghee", "paneer", "other"]).optional(),
      unit: z.string().min(1).optional(),
      pricePerUnit: z.number().positive().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const product = await db.product.update({
      where: { id: req.params.id },
      data,
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json({ data: product });
  } catch (err) { next(err); }
});

// DELETE /products/:id — soft delete (deactivate)
productsRouter.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const product = await db.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ data: product });
  } catch (err) { next(err); }
});
