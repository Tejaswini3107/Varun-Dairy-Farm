import { Router } from "express";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";
import { shouldDeliverOn } from "../services/subscriptionUtils";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireRole("admin", "manager"));

// ── helpers ───────────────────────────────────────────────────────────────────

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return isNaN(d.getTime()) ? fallback : d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function today(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── LEGACY (used by Dashboard) ────────────────────────────────────────────────

// GET /reports/revenue?days=7
reportsRouter.get("/revenue", async (req, res, next) => {
  try {
    const days = parseInt((req.query.days as string) ?? "7");
    const result: { date: string; label: string; revenue: number; orders: number }[] = [];
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
        date: dateKey(date),
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        revenue: revenue._sum.amount ?? 0,
        orders,
      });
    }
    res.json({ data: result });
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
});

// ── SALES ─────────────────────────────────────────────────────────────────────

// GET /reports/sales/daily?from=&to=&routeId=
reportsRouter.get("/sales/daily", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());
    const { routeId } = req.query as Record<string, string>;

    const orders = await db.order.findMany({
      where: {
        status: "delivered",
        date: { gte: from, lte: to },
        ...(routeId ? { routeId } : {}),
      },
      include: { items: { include: { product: true } } },
      orderBy: { date: "asc" },
    });

    const byDate = new Map<string, any>();
    for (const o of orders) {
      const k = dateKey(o.date);
      if (!byDate.has(k)) {
        byDate.set(k, { date: k, orders: 0, customers: new Set<string>(), revenue: 0, products: {} as Record<string, number> });
      }
      const d = byDate.get(k)!;
      d.orders++;
      d.customers.add(o.customerId);
      d.revenue += o.totalAmount;
      for (const item of o.items) {
        d.products[item.product.name] = (d.products[item.product.name] ?? 0) + item.quantity;
      }
    }

    const rows = Array.from(byDate.values()).map((d) => ({ ...d, customers: d.customers.size }));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// GET /reports/sales/monthly?months=12
reportsRouter.get("/sales/monthly", async (req, res, next) => {
  try {
    const months = parseInt((req.query.months as string) ?? "12");
    const from = daysAgo(months * 30);

    const orders = await db.order.findMany({
      where: { status: "delivered", date: { gte: from } },
      select: { date: true, totalAmount: true, customerId: true },
      orderBy: { date: "asc" },
    });

    const byMonth = new Map<string, { month: string; revenue: number; orders: number; customers: Set<string> }>();
    for (const o of orders) {
      const k = o.date.toISOString().slice(0, 7);
      if (!byMonth.has(k)) byMonth.set(k, { month: k, revenue: 0, orders: 0, customers: new Set() });
      const m = byMonth.get(k)!;
      m.revenue += o.totalAmount;
      m.orders++;
      m.customers.add(o.customerId);
    }

    const rows = Array.from(byMonth.values()).map((m, i, arr) => ({
      month: m.month,
      revenue: m.revenue,
      orders: m.orders,
      customers: m.customers.size,
      avgOrderValue: m.orders > 0 ? m.revenue / m.orders : 0,
      growth: i > 0 && arr[i - 1].revenue > 0
        ? ((m.revenue - arr[i - 1].revenue) / arr[i - 1].revenue) * 100
        : 0,
    }));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// GET /reports/sales/products?from=&to=&routeId=
reportsRouter.get("/sales/products", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());
    const { routeId } = req.query as Record<string, string>;

    const items = await db.orderItem.findMany({
      where: {
        order: {
          status: "delivered",
          date: { gte: from, lte: to },
          ...(routeId ? { routeId } : {}),
        },
      },
      include: { product: true },
    });

    const byProduct = new Map<string, any>();
    for (const item of items) {
      const pid = item.productId;
      if (!byProduct.has(pid)) {
        byProduct.set(pid, {
          productId: pid,
          name: item.product.name,
          unit: item.product.unit,
          category: item.product.category,
          quantity: 0,
          revenue: 0,
        });
      }
      const p = byProduct.get(pid)!;
      p.quantity += item.quantity;
      p.revenue += item.totalPrice;
    }

    const rows = Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// GET /reports/sales/routes?from=&to=
reportsRouter.get("/sales/routes", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());

    const routes = await db.route.findMany({
      include: {
        orders: {
          where: { status: "delivered", date: { gte: from, lte: to } },
          select: { totalAmount: true, collectedAmount: true, customerId: true },
        },
        customers: { select: { id: true } },
        agent: { include: { user: { select: { name: true } } } },
      },
    });

    const rows = routes.map((r) => ({
      routeId: r.id,
      name: r.name,
      area: r.area,
      agent: r.agent?.user?.name ?? "—",
      totalCustomers: r.customers.length,
      orders: r.orders.length,
      revenue: r.orders.reduce((s, o) => s + o.totalAmount, 0),
      collected: r.orders.reduce((s, o) => s + (o.collectedAmount ?? 0), 0),
    }));

    res.json({ data: rows.sort((a, b) => b.revenue - a.revenue) });
  } catch (err) { next(err); }
});

// ── DEMAND FORECAST ───────────────────────────────────────────────────────────

// GET /reports/demand/forecast?days=7
reportsRouter.get("/demand/forecast", async (req, res, next) => {
  try {
    const days = Math.min(parseInt((req.query.days as string) ?? "7"), 30);

    const subscriptions = await db.subscription.findMany({
      where: { status: "active" },
      include: { product: true },
    });

    const result: { date: string; label: string; isToday: boolean; products: { productId: string; name: string; unit: string; category: string; qty: number }[] }[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const productQty: Record<string, { name: string; unit: string; category: string; qty: number }> = {};
      for (const sub of subscriptions) {
        const start = sub.startDate ?? sub.createdAt;
        if (shouldDeliverOn(sub.frequency, start, date, sub.deliveryDays)) {
          const pid = sub.productId;
          if (!productQty[pid]) {
            productQty[pid] = {
              name: sub.product.name,
              unit: sub.product.unit,
              category: sub.product.category,
              qty: 0,
            };
          }
          productQty[pid].qty += sub.quantity;
        }
      }

      result.push({
        date: dateKey(date),
        label: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        isToday: i === 0,
        products: Object.entries(productQty)
          .map(([pid, v]) => ({ productId: pid, ...v }))
          .sort((a, b) => b.qty - a.qty),
      });
    }

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

// GET /reports/customers/growth?months=12
reportsRouter.get("/customers/growth", async (req, res, next) => {
  try {
    const months = parseInt((req.query.months as string) ?? "12");
    const from = daysAgo(months * 30);

    const customers = await db.customer.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    const byMonth = new Map<string, { month: string; new: number; active: number; inactive: number }>();
    for (const c of customers) {
      const k = c.createdAt.toISOString().slice(0, 7);
      if (!byMonth.has(k)) byMonth.set(k, { month: k, new: 0, active: 0, inactive: 0 });
      const m = byMonth.get(k)!;
      m.new++;
      if (c.status === "active") m.active++;
      else m.inactive++;
    }

    res.json({ data: Array.from(byMonth.values()) });
  } catch (err) { next(err); }
});

// GET /reports/customers/top?from=&to=&limit=20
reportsRouter.get("/customers/top", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());
    const limit = Math.min(parseInt((req.query.limit as string) ?? "20"), 100);

    const orders = await db.order.findMany({
      where: { status: "delivered", date: { gte: from, lte: to } },
      include: {
        customer: {
          include: {
            user: { select: { name: true, phone: true } },
            subscriptions: { where: { status: "active" }, select: { id: true } },
          },
        },
      },
    });

    const byCustomer = new Map<string, any>();
    for (const o of orders) {
      const cid = o.customerId;
      if (!byCustomer.has(cid)) {
        byCustomer.set(cid, {
          customerId: cid,
          name: o.customer.user.name,
          phone: o.customer.user.phone,
          area: o.customer.area,
          orders: 0,
          revenue: 0,
          activeSubscriptions: o.customer.subscriptions.length,
        });
      }
      const c = byCustomer.get(cid)!;
      c.orders++;
      c.revenue += o.totalAmount;
    }

    const rows = Array.from(byCustomer.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r, avgOrderValue: r.orders > 0 ? r.revenue / r.orders : 0 }));

    res.json({ data: rows });
  } catch (err) { next(err); }
});

// GET /reports/customers/outstanding
reportsRouter.get("/customers/outstanding", async (_req, res, next) => {
  try {
    const orders = await db.order.findMany({
      where: {
        status: "delivered",
        OR: [
          { paymentStatus: "pending" },
          { collectedAmount: { equals: 0 } },
        ],
        totalAmount: { gt: 0 },
      },
      include: { customer: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: { date: "asc" },
    });

    const byCustomer = new Map<string, any>();
    for (const o of orders) {
      const cid = o.customerId;
      if (!byCustomer.has(cid)) {
        byCustomer.set(cid, {
          customerId: cid,
          name: o.customer.user.name,
          phone: o.customer.user.phone,
          area: o.customer.area,
          totalDue: 0,
          orderCount: 0,
          oldestDate: o.date,
        });
      }
      const c = byCustomer.get(cid)!;
      c.totalDue += o.totalAmount - (o.collectedAmount ?? 0);
      c.orderCount++;
      if (o.date < c.oldestDate) c.oldestDate = o.date;
    }

    const rows = Array.from(byCustomer.values())
      .map((c) => ({
        ...c,
        oldestDate: dateKey(c.oldestDate),
        daysOverdue: Math.floor((Date.now() - new Date(c.oldestDate).getTime()) / 86400000),
      }))
      .sort((a, b) => b.totalDue - a.totalDue);

    res.json({ data: rows, total: rows.reduce((s, r) => s + r.totalDue, 0) });
  } catch (err) { next(err); }
});

// ── DELIVERY ──────────────────────────────────────────────────────────────────

// GET /reports/delivery/success?from=&to=&routeId=&agentId=
reportsRouter.get("/delivery/success", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());
    const { routeId, agentId } = req.query as Record<string, string>;

    const orders = await db.order.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { in: ["delivered", "failed"] },
        ...(routeId ? { routeId } : {}),
        ...(agentId ? { deliveryAgentId: agentId } : {}),
      },
      select: { date: true, status: true, totalAmount: true, collectedAmount: true },
      orderBy: { date: "asc" },
    });

    const byDate = new Map<string, any>();
    for (const o of orders) {
      const k = dateKey(o.date);
      if (!byDate.has(k)) byDate.set(k, { date: k, assigned: 0, delivered: 0, failed: 0, collected: 0 });
      const d = byDate.get(k)!;
      d.assigned++;
      if (o.status === "delivered") {
        d.delivered++;
        d.collected += o.collectedAmount ?? 0;
      } else {
        d.failed++;
      }
    }

    const rows = Array.from(byDate.values()).map((d) => ({
      ...d,
      successRate: d.assigned > 0 ? Math.round((d.delivered / d.assigned) * 100) : 0,
    }));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// GET /reports/delivery/staff?from=&to=
reportsRouter.get("/delivery/staff", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());

    const staff = await db.staff.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        orders: {
          where: { date: { gte: from, lte: to }, status: { in: ["delivered", "failed"] } },
          select: { status: true, collectedAmount: true, totalAmount: true },
        },
        routes: { select: { name: true, area: true }, take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    const rows = staff.map((s) => {
      const delivered = s.orders.filter((o) => o.status === "delivered");
      const failed = s.orders.filter((o) => o.status === "failed");
      const collected = delivered.reduce((sum, o) => sum + (o.collectedAmount ?? 0), 0);
      return {
        staffId: s.id,
        name: s.user.name,
        phone: s.user.phone,
        route: s.routes[0]?.name ?? "—",
        assigned: s.orders.length,
        delivered: delivered.length,
        failed: failed.length,
        collected,
        successRate: s.orders.length > 0 ? Math.round((delivered.length / s.orders.length) * 100) : 0,
      };
    });

    res.json({ data: rows.sort((a, b) => b.successRate - a.successRate) });
  } catch (err) { next(err); }
});

// ── FINANCE ───────────────────────────────────────────────────────────────────

// GET /reports/finance/collections?from=&to=
reportsRouter.get("/finance/collections", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());

    const transactions = await db.transaction.findMany({
      where: { status: "success", createdAt: { gte: from, lte: to } },
      select: { method: true, amount: true, createdAt: true, type: true },
      orderBy: { createdAt: "asc" },
    });

    const byMethod: Record<string, number> = {};
    const byDay = new Map<string, Record<string, number>>();
    let total = 0;

    for (const t of transactions) {
      byMethod[t.method] = (byMethod[t.method] ?? 0) + t.amount;
      total += t.amount;
      const k = dateKey(t.createdAt);
      if (!byDay.has(k)) byDay.set(k, {});
      const d = byDay.get(k)!;
      d[t.method] = (d[t.method] ?? 0) + t.amount;
    }

    res.json({
      data: {
        total,
        breakdown: Object.entries(byMethod).map(([method, amount]) => ({
          method,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        })).sort((a, b) => b.amount - a.amount),
        daily: Array.from(byDay.entries()).map(([date, methods]) => ({ date, ...methods })),
      },
    });
  } catch (err) { next(err); }
});

// ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────────

// GET /reports/subscriptions/summary
reportsRouter.get("/subscriptions/summary", async (_req, res, next) => {
  try {
    const [active, paused, cancelled, vacation, byProduct] = await Promise.all([
      db.subscription.count({ where: { status: "active" } }),
      db.subscription.count({ where: { status: "paused" } }),
      db.subscription.count({ where: { status: "cancelled" } }),
      db.subscription.count({ where: { status: "vacation" } }),
      db.subscription.groupBy({
        by: ["productId"],
        where: { status: "active" },
        _count: { id: true },
        _sum: { quantity: true },
      }),
    ]);

    const products = await db.product.findMany({
      where: { id: { in: byProduct.map((b) => b.productId) } },
      select: { id: true, name: true, unit: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const byRoute = await db.subscription.groupBy({
      by: ["customerId"],
      where: { status: "active" },
      _count: { id: true },
    });

    res.json({
      data: {
        totals: { active, paused, cancelled, vacation, total: active + paused + cancelled + vacation },
        byProduct: byProduct.map((b) => ({
          productId: b.productId,
          name: productMap.get(b.productId)?.name ?? "—",
          unit: productMap.get(b.productId)?.unit ?? "",
          subscribers: b._count.id,
          dailyQuantity: b._sum.quantity ?? 0,
        })).sort((a, b) => b.dailyQuantity - a.dailyQuantity),
        customersWithSubs: byRoute.length,
      },
    });
  } catch (err) { next(err); }
});

// ── INVENTORY / WASTAGE ───────────────────────────────────────────────────────

// GET /reports/inventory/wastage?from=&to=
reportsRouter.get("/inventory/wastage", async (req, res, next) => {
  try {
    const from = parseDate(req.query.from as string, daysAgo(30));
    const to = parseDate(req.query.to as string, today());

    const logs = await db.spoilageLog.findMany({
      where: { loggedAt: { gte: from, lte: to } },
      include: { product: { select: { name: true, unit: true, pricePerUnit: true } } },
      orderBy: { loggedAt: "desc" },
    });

    const rows = logs.map((l) => ({
      id: l.id,
      product: l.product.name,
      unit: l.product.unit,
      quantity: l.quantity,
      valueLost: l.valueLost,
      reason: l.reason,
      date: dateKey(l.loggedAt),
    }));

    res.json({
      data: rows,
      totals: {
        quantity: rows.reduce((s, r) => s + r.quantity, 0),
        valueLost: rows.reduce((s, r) => s + r.valueLost, 0),
      },
    });
  } catch (err) { next(err); }
});
