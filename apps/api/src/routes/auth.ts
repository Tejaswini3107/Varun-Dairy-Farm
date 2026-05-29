import { Router } from "express";
import { z } from "zod";
import { db } from "@varun/database";
import { signToken } from "../middleware/auth";
import { generateOtp, sendOtp } from "../services/notifications";

export const authRouter = Router();

const phoneSchema = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/) });
const verifySchema = z.object({ phone: z.string(), code: z.string().length(4) });

// POST /auth/send-otp
authRouter.post("/send-otp", async (req, res, next) => {
  try {
    const { phone } = phoneSchema.parse(req.body);

    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      user = await db.user.create({
        data: { phone, name: "New User", role: "customer" },
      });
    }

    // Expire previous OTPs
    await db.otpCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.otpCode.create({ data: { userId: user.id, code, expiresAt } });
    await sendOtp(phone, code);

    res.json({ message: "OTP sent" });
  } catch (err) {
    next(err);
  }
});

// POST /auth/verify-otp
authRouter.post("/verify-otp", async (req, res, next) => {
  try {
    const { phone, code } = verifySchema.parse(req.body);

    const user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const otp = await db.otpCode.findFirst({
      where: { userId: user.id, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }

    await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const token = await signToken(user.id);
    res.json({
      data: {
        token,
        user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/update-fcm-token
authRouter.post("/update-fcm-token", async (req, res, next) => {
  try {
    const { userId, fcmToken } = req.body;
    await db.user.update({ where: { id: userId }, data: { fcmToken } });
    res.json({ message: "FCM token updated" });
  } catch (err) {
    next(err);
  }
});
