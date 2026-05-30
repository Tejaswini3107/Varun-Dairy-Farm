import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { customersRouter } from "./routes/customers";
import { ordersRouter } from "./routes/orders";
import { deliveryRouter } from "./routes/delivery";
import { inventoryRouter } from "./routes/inventory";
import { billingRouter } from "./routes/billing";
import { reportsRouter } from "./routes/reports";
import { staffRouter } from "./routes/staff";
import { subscriptionsRouter } from "./routes/subscriptions";
import { webhooksRouter } from "./routes/webhooks";
import { dashboardRouter } from "./routes/dashboard";
import { errorHandler } from "./middleware/error";
import { startJobWorkers } from "./jobs/workers";

const app = express();
const PORT = process.env.PORT ?? 4000;

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// Raw body for webhook signature verification — must come before json()
app.use("/webhooks", express.raw({ type: "application/json" }), webhooksRouter);

app.use(express.json({ limit: "10mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/dashboard", dashboardRouter);
app.use("/customers", customersRouter);
app.use("/orders", ordersRouter);
app.use("/delivery", deliveryRouter);
app.use("/inventory", inventoryRouter);
app.use("/billing", billingRouter);
app.use("/reports", reportsRouter);
app.use("/staff", staffRouter);
app.use("/subscriptions", subscriptionsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  startJobWorkers();
});

export default app;
