import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@varun/database";
import { signToken, requireAuth } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";

export const authRouter: ExpressRouter = Router();

const phoneSchema = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/) });
const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be 4 digits");

// POST /auth/check-phone — returns { hasPin: bool, name: string|null }
authRouter.post("/check-phone", async (req, res, next) => {
  try {
    const { phone } = phoneSchema.parse(req.body);
    const user = await db.user.findUnique({ where: { phone }, select: { name: true, pinHash: true } });
    res.json({ data: { exists: !!user, hasPin: !!(user?.pinHash), name: user?.name ?? null } });
  } catch (err) { next(err); }
});

// POST /auth/setup-pin — first-time PIN creation (or re-set after 180 days)
authRouter.post("/setup-pin", async (req, res, next) => {
  try {
    const { phone, pin, confirmPin } = z.object({
      phone: z.string().regex(/^[6-9]\d{9}$/),
      pin: pinSchema,
      confirmPin: pinSchema,
    }).parse(req.body);

    if (pin !== confirmPin) {
      res.status(400).json({ error: "PINs do not match" });
      return;
    }

    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      user = await db.user.create({ data: { phone, name: "New User", role: "customer" } });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    user = await db.user.update({
      where: { id: user.id },
      data: { pinHash, pinSetAt: new Date() },
    });

    const token = await signToken(user.id);
    const [customer, staff] = await Promise.all([
      db.customer.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.staff.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);
    res.json({
      data: {
        token,
        user: { id: user.id, name: user.name, phone: user.phone, role: user.role, customerId: customer?.id ?? null, staffId: staff?.id ?? null },
      },
    });
  } catch (err) { next(err); }
});

// POST /auth/login-pin — login with phone + PIN, returns JWT (180d)
authRouter.post("/login-pin", async (req, res, next) => {
  try {
    const { phone, pin } = z.object({
      phone: z.string().regex(/^[6-9]\d{9}$/),
      pin: pinSchema,
    }).parse(req.body);

    const user = await db.user.findUnique({ where: { phone } });
    if (!user || !user.pinHash) {
      res.status(400).json({ error: "No PIN set for this number. Please set a PIN first." });
      return;
    }

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect PIN" });
      return;
    }

    // Check if PIN is older than 180 days
    const pinAge = user.pinSetAt ? (Date.now() - user.pinSetAt.getTime()) / (1000 * 60 * 60 * 24) : 999;
    if (pinAge > 180) {
      res.status(403).json({ error: "PIN expired", code: "PIN_EXPIRED" });
      return;
    }

    const token = await signToken(user.id);
    const [customer, staff] = await Promise.all([
      db.customer.findUnique({ where: { userId: user.id }, select: { id: true } }),
      db.staff.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);
    res.json({
      data: {
        token,
        user: { id: user.id, name: user.name, phone: user.phone, role: user.role, customerId: customer?.id ?? null, staffId: staff?.id ?? null },
        pinExpiresIn: Math.max(0, Math.floor(180 - pinAge)),
      },
    });
  } catch (err) { next(err); }
});

// POST /auth/reset-pin — change PIN (requires old PIN or phone-based reset)
authRouter.post("/reset-pin", async (req, res, next) => {
  try {
    const { phone, newPin, confirmPin } = z.object({
      phone: z.string().regex(/^[6-9]\d{9}$/),
      newPin: pinSchema,
      confirmPin: pinSchema,
    }).parse(req.body);

    if (newPin !== confirmPin) {
      res.status(400).json({ error: "PINs do not match" });
      return;
    }

    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const pinHash = await bcrypt.hash(newPin, 10);
    await db.user.update({ where: { id: user.id }, data: { pinHash, pinSetAt: new Date() } });
    res.json({ message: "PIN reset successfully. Please log in with your new PIN." });
  } catch (err) { next(err); }
});

// DELETE /auth/account — delete own account (requires valid JWT + PIN confirmation)
authRouter.delete("/account", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { pin } = z.object({ pin: pinSchema }).parse(req.body);
    const userId = req.user!.id;
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.pinHash) {
      res.status(400).json({ error: "No PIN set" });
      return;
    }
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect PIN — account not deleted" });
      return;
    }

    // Cascade delete customer data if exists
    const customer = await db.customer.findUnique({ where: { userId } });
    if (customer) {
      await db.subscription.deleteMany({ where: { customerId: customer.id } });
      await db.orderItem.deleteMany({ where: { order: { customerId: customer.id } } });
      await db.order.deleteMany({ where: { customerId: customer.id } });
      await db.transaction.deleteMany({ where: { customerId: customer.id } });
      await db.customer.delete({ where: { id: customer.id } });
    }
    await db.otpCode.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });

    res.json({ message: "Account deleted" });
  } catch (err) { next(err); }
});

// POST /auth/update-fcm-token
authRouter.post("/update-fcm-token", async (req, res, next) => {
  try {
    const { userId, fcmToken } = req.body;
    await db.user.update({ where: { id: userId }, data: { fcmToken } });
    res.json({ message: "FCM token updated" });
  } catch (err) { next(err); }
});
