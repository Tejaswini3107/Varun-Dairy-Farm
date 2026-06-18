import { Queue, Worker } from "bullmq";
import { generateDailyOrders } from "../services/orderGeneration";

function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379"),
  };
}

let orderQueue: Queue | null = null;
let notificationQueue: Queue | null = null;

export function getOrderQueue() {
  return orderQueue;
}

export function startJobWorkers() {
  try {
    const connection = getRedisConnection();

    orderQueue = new Queue("orders", { connection });
    notificationQueue = new Queue("notifications", { connection });

    new Worker(
      "orders",
      async (job) => {
        if (job.name === "generate-daily-orders") {
          await generateDailyOrders();
        }
      },
      { connection }
    );

    orderQueue.upsertJobScheduler(
      "daily-order-generation",
      { pattern: "30 22 * * *" },
      { name: "generate-daily-orders", data: {} }
    );

    console.log("⚙️  Job workers started");
  } catch (err) {
    console.error("⚠️  Redis unavailable — job workers not started:", err);
  }
}
