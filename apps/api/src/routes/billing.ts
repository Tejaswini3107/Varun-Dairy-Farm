import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { requireAuth, requireRole } from "../middleware/auth";
import { createRazorpayOrder } from "../services/razorpay";
import { sendWhatsApp } from "../services/notifications";

export const billingRouter = Router();
billingRouter.use(requireAuth);

// GET /billing/summary
billingRouter.get("/summary", requireRole("admin", "manager"), async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [collected, pending, walletFloat] = await Promise.all([
      db.transaction.aggregate({
        where: { status: "success", createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { status: "pending" },
        _sum: { amount: true },
      }),
      db.customer.aggregate({ _sum: { walletBalance: true } }),
    ]);

    const pendingCustomers = await db.customer.count({
      where: { walletBalance: { lt: 0 } },
    });

    const totalBilled = (collected._sum.amount ?? 0) + (pending._sum.amount ?? 0);

    res.json({
      data: {
        totalBilled,
        totalCollected: collected._sum.amount ?? 0,
        pendingDues: Math.abs(pending._sum.amount ?? 0),
        walletFloat: walletFloat._sum.walletBalance ?? 0,
        pendingCustomers,
        successRate: totalBilled > 0 ? ((collected._sum.amount ?? 0) / totalBilled) * 100 : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /billing/transactions
billingRouter.get("/transactions", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { page = "1", pageSize = "30" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        include: { customer: { include: { user: { select: { name: true } } } } },
        skip,
        take: parseInt(pageSize),
        orderBy: { createdAt: "desc" },
      }),
      db.transaction.count(),
    ]);

    res.json({ data: transactions, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) });
  } catch (err) {
    next(err);
  }
});

// POST /billing/create-razorpay-order
billingRouter.post("/create-razorpay-order", async (req, res, next) => {
  try {
    const { amount, customerId } = z.object({
      amount: z.number().positive(),
      customerId: z.string(),
    }).parse(req.body);

    const order = await createRazorpayOrder(amount, customerId);
    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

// GET /billing/customers — per-customer monthly billing summary
billingRouter.get("/customers", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { month } = req.query as Record<string, string>;
    let start: Date, end: Date;
    if (month) {
      start = new Date(`${month}-01T00:00:00.000Z`);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
    } else {
      start = new Date();
      start.setDate(1); start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
    }

    const customers = await db.customer.findMany({
      include: { user: { select: { name: true, phone: true } } },
    });

    const rows = await Promise.all(customers.map(async (c) => {
      const [orders, skipped, collected] = await Promise.all([
        db.order.count({ where: { customerId: c.id, status: "delivered", date: { gte: start, lt: end } } }),
        db.order.count({ where: { customerId: c.id, notes: "customer_skip", date: { gte: start, lt: end } } }),
        db.transaction.aggregate({
          where: { customerId: c.id, status: "success", createdAt: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
      ]);
      return {
        id: c.id,
        name: c.user.name,
        phone: c.user.phone,
        area: c.area,
        walletBalance: c.walletBalance,
        delivered: orders,
        skipped,
        collected: collected._sum.amount ?? 0,
      };
    }));

    res.json({ data: rows.filter(r => r.delivered > 0 || r.skipped > 0 || r.collected > 0) });
  } catch (err) { next(err); }
});

// POST /billing/send-reminders
billingRouter.post("/send-reminders", requireRole("admin", "manager"), async (_req, res, next) => {
  try {
    const dueCustomers = await db.customer.findMany({
      where: { walletBalance: { lt: 0 } },
      include: { user: { select: { name: true, phone: true } } },
    });

    let sent = 0;
    for (const c of dueCustomers) {
      await sendWhatsApp(
        c.user.phone,
        `Hi ${c.user.name}, your Varun Dairy wallet has dues of ₹${Math.abs(c.walletBalance).toFixed(0)}. Please recharge to avoid interruption.`
      ).catch(() => {});
      sent++;
    }

    res.json({ message: `Reminders sent to ${sent} customers` });
  } catch (err) {
    next(err);
  }
});
