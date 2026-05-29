import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";

export const customersRouter = Router();
customersRouter.use(requireAuth);

// GET /customers
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
        { area: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          route: { select: { name: true, area: true } },
          subscriptions: { include: { product: true } },
        },
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: "desc" },
      }),
      db.customer.count({ where }),
    ]);

    res.json({
      data: customers.map((c) => ({
        id: c.id,
        name: c.user.name,
        phone: c.user.phone,
        address: c.address,
        area: c.area,
        routeId: c.routeId,
        routeName: c.route.name,
        walletBalance: c.walletBalance,
        autoPay: c.autoPay,
        status: c.status,
        subscriptions: c.subscriptions,
        createdAt: c.createdAt,
      })),
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id
customersRouter.get("/:id", async (req, res, next) => {
  try {
    const customer = await db.customer.findUniqueOrThrow({
      where: { id: req.params.id },
      include: {
        user: true,
        route: true,
        subscriptions: { include: { product: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { items: { include: { product: true } } },
        },
        transactions: { take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// POST /customers
customersRouter.post("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      phone: z.string().regex(/^[6-9]\d{9}$/),
      address: z.string().min(5),
      area: z.string().min(2),
      routeId: z.string(),
      landmark: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const user = await db.user.create({
      data: { name: data.name, phone: data.phone, role: "customer" },
    });

    const customer = await db.customer.create({
      data: {
        userId: user.id,
        address: data.address,
        area: data.area,
        routeId: data.routeId,
        landmark: data.landmark,
      },
      include: { user: true, route: true },
    });

    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// PATCH /customers/:id
customersRouter.patch("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const customer = await db.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// POST /customers/:id/recharge-wallet
customersRouter.post("/:id/recharge-wallet", async (req, res, next) => {
  try {
    const { amount } = z.object({ amount: z.number().positive() }).parse(req.body);
    const customer = await db.customer.update({
      where: { id: req.params.id },
      data: { walletBalance: { increment: amount } },
    });
    await db.transaction.create({
      data: {
        customerId: customer.id,
        type: "recharge",
        method: "upi",
        amount,
        status: "success",
      },
    });
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
});
