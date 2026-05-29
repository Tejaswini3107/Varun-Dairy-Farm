import { Router } from "express";
import crypto from "crypto";
import { db } from "@varun/database";

export const webhooksRouter = Router();

// POST /webhooks/razorpay
webhooksRouter.post("/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (signature !== expectedSig) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;

    await db.transaction.updateMany({
      where: { razorpayOrderId: payment.order_id },
      data: {
        status: "success",
        razorpayPaymentId: payment.id,
      },
    });

    // Recharge customer wallet
    const txn = await db.transaction.findFirst({
      where: { razorpayOrderId: payment.order_id },
    });
    if (txn) {
      await db.customer.update({
        where: { id: txn.customerId },
        data: { walletBalance: { increment: payment.amount / 100 } },
      });
    }
  }

  res.json({ status: "ok" });
});
