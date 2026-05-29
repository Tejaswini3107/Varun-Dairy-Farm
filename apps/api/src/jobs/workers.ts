import { Queue, Worker } from "bullmq";
import { generateDailyOrders } from "../services/orderGeneration";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
};

export const orderQueue = new Queue("orders", { connection });
export const notificationQueue = new Queue("notifications", { connection });

export function startJobWorkers() {
  // Order generation worker
  new Worker(
    "orders",
    async (job) => {
      if (job.name === "generate-daily-orders") {
        await generateDailyOrders();
      }
    },
    { connection }
  );

  // Schedule daily order generation at 4 AM IST (22:30 UTC)
  orderQueue.upsertJobScheduler(
    "daily-order-generation",
    { pattern: "30 22 * * *" },
    { name: "generate-daily-orders", data: {} }
  );

  console.log("⚙️  Job workers started");
}
