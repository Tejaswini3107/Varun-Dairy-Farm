import { Router } from "express";
import { db } from "@varun/database";
import { requireAuth } from "../middleware/auth";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get("/kpis", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      todayOrders,
      yesterdayOrders,
      activeSubscriptions,
      renewalsDue,
      collections,
      pendingDues,
      routes,
      deliveredToday,
      totalToday,
    ] = await Promise.all([
      db.order.count({ where: { date: { gte: today, lt: tomorrow } } }),
      db.order.count({ where: { date: { gte: yesterday, lt: today } } }),
      db.subscription.count({ where: { status: "active" } }),
      db.subscription.count({
        where: {
          status: "active",
          nextDeliveryDate: { gte: today, lt: new Date(Date.now() + 7 * 86400000) },
        },
      }),
      db.transaction.aggregate({
        where: { status: "success", createdAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      db.customer.aggregate({ where: { walletBalance: { lt: 0 } }, _sum: { walletBalance: true } }),
      db.route.count(),
      db.order.count({ where: { status: "delivered", date: { gte: today, lt: tomorrow } } }),
      db.order.count({ where: { date: { gte: today, lt: tomorrow } } }),
    ]);

    const milkItems = await db.orderItem.aggregate({
      where: {
        order: { date: { gte: today, lt: tomorrow } },
        product: { category: "milk" },
      },
      _sum: { quantity: true },
    });

    res.json({
      data: {
        todayOrders,
        ordersChange: todayOrders - yesterdayOrders,
        milkVolumeLitres: milkItems._sum.quantity ?? 0,
        totalRoutes: routes,
        collectionsToday: collections._sum.amount ?? 0,
        pendingCollections: Math.abs(pendingDues._sum.walletBalance ?? 0),
        activeSubscriptions,
        renewalsDue,
        deliveredCount: deliveredToday,
        pendingDeliveries: totalToday - deliveredToday,
        deliveryPercent: totalToday > 0 ? Math.round((deliveredToday / totalToday) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

dashboardRouter.get("/feed", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [recentOrders, recentTxns] = await Promise.all([
      db.order.findMany({
        where: { status: "delivered", date: { gte: today } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          customer: { include: { user: { select: { name: true } } } },
          deliveryAgent: { include: { user: { select: { name: true } } } },
        },
      }),
      db.transaction.findMany({
        where: { createdAt: { gte: today }, status: "success" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: { include: { user: { select: { name: true } } } } },
      }),
    ]);

    const feed = [
      ...recentOrders.map(o => ({
        type: "delivery",
        text: `${o.deliveryAgent?.user.name ?? "Agent"} delivered to ${o.customer.user.name}`,
        time: o.updatedAt,
        color: "green",
      })),
      ...recentTxns.map(t => ({
        type: "payment",
        text: `₹${t.amount} collected from ${t.customer.user.name}`,
        time: t.createdAt,
        color: "blue",
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);

    res.json({ data: feed });
  } catch (err) {
    next(err);
  }
});
