import { Router } from "express";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("admin", "manager"));

// GET /reports/revenue?days=7
reportsRouter.get("/revenue", async (req, res, next) => {
  try {
    const days = parseInt((req.query.days as string) ?? "7");
    const result = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const next = new Date(date);
      next.setDate(next.getDate() + 1);

      const [revenue, orders] = await Promise.all([
        db.transaction.aggregate({
          where: { status: "success", createdAt: { gte: date, lt: next } },
          _sum: { amount: true },
        }),
        db.order.count({ where: { date: { gte: date, lt: next } } }),
      ]);

      result.push({
        date: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        revenue: revenue._sum.amount ?? 0,
        orders,
      });
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /reports/product-demand
reportsRouter.get("/product-demand", async (_req, res, next) => {
  try {
    const items = await db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
    });

    const withProducts = await Promise.all(
      items.map(async (item) => {
        const product = await db.product.findUnique({ where: { id: item.productId } });
        return {
          productId: item.productId,
          product: product?.name,
          category: product?.category,
          totalQuantity: item._sum.quantity ?? 0,
          totalRevenue: item._sum.totalPrice ?? 0,
        };
      })
    );

    res.json({ data: withProducts });
  } catch (err) {
    next(err);
  }
});

// GET /reports/retention
reportsRouter.get("/retention", async (_req, res, next) => {
  try {
    const [active, total] = await Promise.all([
      db.customer.count({ where: { status: "active" } }),
      db.customer.count(),
    ]);
    const retained = total > 0 ? (active / total) * 100 : 0;
    res.json({ data: { active, total, retained, churn: 100 - retained } });
  } catch (err) {
    next(err);
  }
});
