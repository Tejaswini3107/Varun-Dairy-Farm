import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";
import { shouldDeliverOn } from "../services/subscriptionUtils";
import { recalculateOrderForCustomer } from "../services/orderGeneration";

export const customersRouter = Router();
customersRouter.use(requireAuth);

// ── Customer-facing (self) ────────────────────────────────────────────────────

customersRouter.get("/me", async (req: any, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) { res.status(403).json({ error: "Not a customer" }); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        user: { select: { name: true, phone: true } },
        route: { select: { name: true, area: true } },
        subscriptions: { where: { status: { not: "cancelled" } }, include: { product: true }, orderBy: { createdAt: "asc" } },
        orders: {
          where: { date: { gte: today, lt: tomorrow } },
          include: { items: { include: { product: true } }, deliveryAgent: { include: { user: { select: { name: true } } } } },
          take: 1, orderBy: { createdAt: "desc" },
        },
        transactions: { take: 15, orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json({ data: customer });
  } catch (err) { next(err); }
});

customersRouter.patch("/me/vacation", async (req: any, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) { res.status(403).json({ error: "Not a customer" }); return; }
    const { from, until } = z.object({ from: z.string(), until: z.string() }).parse(req.body);
    await db.subscription.updateMany({ where: { customerId, status: "active" }, data: { status: "vacation", vacationFrom: new Date(from), vacationUntil: new Date(until) } });
    const fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
    const untilDate = new Date(until); untilDate.setHours(23, 59, 59, 999);
    await db.order.updateMany({ where: { customerId, status: { in: ["pending", "assigned"] }, date: { gte: fromDate, lte: untilDate } }, data: { status: "cancelled" } });
    res.json({ message: "Vacation mode set", from, until });
  } catch (err) { next(err); }
});

customersRouter.patch("/me/pause-all", async (req: any, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) { res.status(403).json({ error: "Not a customer" }); return; }
    const { pause } = z.object({ pause: z.boolean() }).parse(req.body);
    await db.subscription.updateMany({ where: { customerId }, data: { status: pause ? "paused" : "active" } });
    if (pause) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      await db.order.updateMany({ where: { customerId, status: { in: ["pending", "assigned"] }, date: { gte: today, lt: tomorrow } }, data: { status: "cancelled" } });
    } else {
      recalculateOrderForCustomer(customerId).catch(console.error);
    }
    res.json({ message: pause ? "All subscriptions paused" : "All subscriptions resumed" });
  } catch (err) { next(err); }
});

customersRouter.get("/me/tomorrow", async (req: any, res, next) => {
  try {
    const customerId = req.user?.customerId;
    if (!customerId) { res.status(403).json({ error: "Not a customer" }); return; }
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    const subs = await db.subscription.findMany({
      where: { customerId, status: "active", OR: [{ pauseUntil: null }, { pauseUntil: { lt: tomorrow } }] },
      include: { product: true },
    });
    const delivering = subs.filter(s => shouldDeliverOn(s.frequency, s.createdAt, tomorrow, s.deliveryDays));
    const total = delivering.reduce((sum, s) => sum + s.quantity * s.product.pricePerUnit, 0);
    res.json({ data: delivering, total, date: tomorrow.toISOString().split("T")[0] });
  } catch (err) { next(err); }
});

// ── Admin: list & search ──────────────────────────────────────────────────────

customersRouter.get("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { search, routeId, status, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (routeId) where.routeId = routeId;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { phone: { contains: search } } },
        { alternateMobile: { contains: search } },
        { area: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          route: { select: { name: true, area: true } },
          subscriptions: { where: { status: { not: "cancelled" } }, include: { product: true } },
        },
        skip, take: parseInt(pageSize),
        orderBy: [{ routeId: "asc" }, { stopSequence: "asc" }, { createdAt: "desc" }],
      }),
      db.customer.count({ where }),
    ]);
    res.json({
      data: customers.map(c => ({
        id: c.id, name: c.user.name, phone: c.user.phone,
        alternateMobile: c.alternateMobile, city: c.city, pincode: c.pincode,
        address: c.address, area: c.area, landmark: c.landmark,
        routeId: c.routeId, routeName: c.route.name, stopSequence: c.stopSequence,
        walletBalance: c.walletBalance, autoPay: c.autoPay, status: c.status,
        billingMode: c.billingMode,
        subscriptions: c.subscriptions, createdAt: c.createdAt,
        route: c.route,
      })),
      total, page: parseInt(page), pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    });
  } catch (err) { next(err); }
});

// ── Admin: full profile ───────────────────────────────────────────────────────

customersRouter.get("/:id/profile", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

    const [customer, deliveryStats] = await Promise.all([
      db.customer.findUniqueOrThrow({
        where: { id: req.params.id },
        include: {
          user: true,
          route: { include: { agent: { include: { user: { select: { name: true, phone: true } } } } } },
          subscriptions: { include: { product: true }, orderBy: { createdAt: "asc" } },
          orders: {
            orderBy: { date: "desc" }, take: 30,
            include: { items: { include: { product: true } }, deliveryAgent: { include: { user: { select: { name: true } } } } },
          },
          transactions: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      }),
      db.order.groupBy({
        by: ["status"],
        where: { customerId: req.params.id, date: { gte: monthAgo } },
        _count: { id: true },
      }),
    ]);

    const stats = {
      delivered: deliveryStats.find(s => s.status === "delivered")?._count.id ?? 0,
      failed: deliveryStats.find(s => s.status === "failed")?._count.id ?? 0,
      cancelled: deliveryStats.find(s => s.status === "cancelled")?._count.id ?? 0,
      totalSpent: customer.transactions.filter(t => ["debit", "auto_debit"].includes(t.type)).reduce((s, t) => s + t.amount, 0),
    };

    res.json({ data: { ...customer, stats } });
  } catch (err) { next(err); }
});

// ── Admin: subscriptions for a customer ──────────────────────────────────────

customersRouter.post("/:id/subscriptions", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      productId: z.string(),
      quantity: z.number().positive(),
      frequency: z.enum(["daily", "alternate", "weekly", "monthly"]).default("daily"),
      deliveryDays: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const customerId = req.params.id;

    const existing = await db.subscription.findFirst({ where: { customerId, productId: data.productId } });
    let sub;
    if (existing) {
      sub = await db.subscription.update({
        where: { id: existing.id },
        data: {
          ...data,
          status: "active",
          pauseUntil: null, vacationFrom: null, vacationUntil: null,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        include: { product: true },
      });
    } else {
      sub = await db.subscription.create({
        data: {
          customerId,
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        include: { product: true },
      });
    }
    recalculateOrderForCustomer(customerId).catch(console.error);
    res.status(existing ? 200 : 201).json({ data: sub });
  } catch (err) { next(err); }
});

customersRouter.patch("/:id/subscriptions/:subId", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      quantity: z.number().positive().optional(),
      frequency: z.enum(["daily", "alternate", "weekly", "monthly"]).optional(),
      deliveryDays: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      status: z.enum(["active", "paused", "vacation", "cancelled"]).optional(),
    });
    const data = schema.parse(req.body);
    const sub = await db.subscription.update({
      where: { id: req.params.subId, customerId: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : data.startDate === null ? null : undefined,
        endDate: data.endDate ? new Date(data.endDate) : data.endDate === null ? null : undefined,
      },
      include: { product: true },
    });
    recalculateOrderForCustomer(req.params.id).catch(console.error);
    res.json({ data: sub });
  } catch (err) { next(err); }
});

// ── Admin: bulk CSV import ────────────────────────────────────────────────────

customersRouter.post("/bulk-import", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { rows } = z.object({
      rows: z.array(z.object({
        name: z.string(),
        phone: z.string(),
        address: z.string().default(""),
        area: z.string().default(""),
        city: z.string().optional(),
        routeId: z.string(),
        milkQty: z.number().default(0),
        curdQty: z.number().default(0),
        paneerQty: z.number().default(0),
        gheeQty: z.number().default(0),
      })),
    }).parse(req.body);

    const products = await db.product.findMany({ where: { isActive: true } });
    const byCategory = (cat: string) => products.find(p => p.category === cat && p.isActive);

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        const phone = row.phone.replace(/\D/g, "").slice(-10);
        if (phone.length !== 10) { results.errors.push(`${row.name}: invalid phone ${row.phone}`); results.skipped++; continue; }

        let user = await db.user.findUnique({ where: { phone } });
        if (!user) user = await db.user.create({ data: { name: row.name, phone, role: "customer" } });

        let customer = await db.customer.findUnique({ where: { userId: user.id } });
        if (!customer) {
          customer = await db.customer.create({
            data: { userId: user.id, address: row.address, area: row.area, city: row.city, routeId: row.routeId },
          });
        }

        const subs: { productId: string; quantity: number }[] = [];
        if (row.milkQty > 0 && byCategory("milk")) subs.push({ productId: byCategory("milk")!.id, quantity: row.milkQty });
        if (row.curdQty > 0 && byCategory("curd")) subs.push({ productId: byCategory("curd")!.id, quantity: row.curdQty });
        if (row.paneerQty > 0 && byCategory("paneer")) subs.push({ productId: byCategory("paneer")!.id, quantity: row.paneerQty });
        if (row.gheeQty > 0 && byCategory("ghee")) subs.push({ productId: byCategory("ghee")!.id, quantity: row.gheeQty });

        for (const s of subs) {
          const ex = await db.subscription.findFirst({ where: { customerId: customer.id, productId: s.productId } });
          if (ex) {
            await db.subscription.update({ where: { id: ex.id }, data: { quantity: s.quantity, status: "active" } });
          } else {
            await db.subscription.create({ data: { customerId: customer.id, ...s, frequency: "daily" } });
          }
        }

        recalculateOrderForCustomer(customer.id).catch(() => {});
        results.created++;
      } catch (e: any) {
        results.errors.push(`${row.name}: ${e.message}`);
        results.skipped++;
      }
    }

    res.json(results);
  } catch (err) { next(err); }
});

// ── Admin: create customer ────────────────────────────────────────────────────

customersRouter.post("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      phone: z.string().regex(/^[6-9]\d{9}$/),
      alternateMobile: z.string().optional(),
      address: z.string().min(1),
      area: z.string().min(1),
      city: z.string().optional(),
      pincode: z.string().optional(),
      landmark: z.string().optional(),
      notes: z.string().optional(),
      routeId: z.string(),
      stopSequence: z.number().int().optional(),
      // Inline subscriptions during creation
      subscriptions: z.array(z.object({
        productId: z.string(),
        quantity: z.number().positive(),
        frequency: z.enum(["daily", "alternate", "weekly", "monthly"]).default("daily"),
        deliveryDays: z.string().optional(),
        startDate: z.string().optional(),
      })).optional(),
    });

    const data = schema.parse(req.body);
    const { subscriptions: subsData, ...customerData } = data;

    let user = await db.user.findUnique({ where: { phone: customerData.phone } });
    if (!user) {
      user = await db.user.create({ data: { name: customerData.name, phone: customerData.phone, role: "customer" } });
    }

    const customer = await db.customer.create({
      data: {
        userId: user.id,
        address: customerData.address,
        area: customerData.area,
        city: customerData.city,
        pincode: customerData.pincode,
        landmark: customerData.landmark,
        alternateMobile: customerData.alternateMobile,
        notes: customerData.notes,
        routeId: customerData.routeId,
        stopSequence: customerData.stopSequence,
      },
      include: { user: true, route: true },
    });

    if (subsData?.length) {
      for (const s of subsData) {
        await db.subscription.create({
          data: {
            customerId: customer.id,
            productId: s.productId,
            quantity: s.quantity,
            frequency: s.frequency,
            deliveryDays: s.deliveryDays,
            startDate: s.startDate ? new Date(s.startDate) : undefined,
          },
        });
      }
      recalculateOrderForCustomer(customer.id).catch(console.error);
    }

    res.status(201).json({ data: customer });
  } catch (err) { next(err); }
});

// ── Admin: update, route-move, recharge ──────────────────────────────────────

customersRouter.patch("/:id/route", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { routeId } = z.object({ routeId: z.string() }).parse(req.body);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const newRoute = await db.route.findUniqueOrThrow({ where: { id: routeId } });
    await db.customer.update({ where: { id: req.params.id }, data: { routeId } });
    const ordersToMove = await db.order.findMany({
      where: { customerId: req.params.id, date: { gte: today, lt: tomorrow }, status: { in: ["pending", "assigned"] } },
    });
    if (ordersToMove.length > 0) {
      await db.order.updateMany({
        where: { id: { in: ordersToMove.map(o => o.id) } },
        data: { routeId, deliveryAgentId: newRoute.agentId ?? null, status: newRoute.agentId ? "assigned" : "pending" },
      });
    }
    res.json({ message: `Customer moved to ${newRoute.name}`, ordersUpdated: ordersToMove.length });
  } catch (err) { next(err); }
});

customersRouter.get("/:id", async (req, res, next) => {
  try {
    const customer = await db.customer.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        user: true, route: true,
        subscriptions: { include: { product: true } },
        orders: { take: 10, orderBy: { createdAt: "desc" }, include: { items: { include: { product: true } } } },
        transactions: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    res.json({ data: customer });
  } catch (err) { next(err); }
});

customersRouter.patch("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      address: z.string().optional(), area: z.string().optional(),
      city: z.string().optional(), pincode: z.string().optional(),
      landmark: z.string().optional(), alternateMobile: z.string().optional(),
      notes: z.string().optional(), stopSequence: z.number().int().optional(),
      status: z.enum(["active", "inactive", "blocked"]).optional(),
      billingMode: z.enum(["per_delivery", "monthly"]).optional(),
    });
    const data = schema.parse(req.body);
    const customer = await db.customer.update({ where: { id: req.params.id }, data });
    res.json({ data: customer });
  } catch (err) { next(err); }
});

customersRouter.post("/:id/recharge-wallet", async (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);
    const customer = await db.customer.update({ where: { id: req.params.id }, data: { walletBalance: { increment: amount } } });
    await db.transaction.create({ data: { customerId: customer.id, type: "recharge", method: "upi", amount, status: "success" } });
    res.json({ data: customer });
  } catch (err) { next(err); }
});
