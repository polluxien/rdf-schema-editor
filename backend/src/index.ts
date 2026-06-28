import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectToDatabase } from "./services/mongodb";
import { prefillWithUsers } from "../mock/prefill";
import { logger } from "./logger";

const PORT = process.env.PORT ?? 4000;
const MONGODB_URI = process.env.MONGODB_URI ?? "(not set)";

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { message: err.message, stack: err.stack });
  process.exit(1);
});

async function start() {
  logger.info(`Starting backend`, { port: PORT, mongoUri: MONGODB_URI, env: process.env.NODE_ENV });

  await connectToDatabase();
  logger.info("MongoDB connected");

  if (process.env.PREFILL_USERS === "true") {
    await prefillWithUsers();
    logger.info("Prefill complete");
  }

  app.listen(PORT, () => {
    logger.info(`Server listening`, { port: PORT });
  });
}

start().catch((err) => {
  logger.error("Startup failed", { message: err instanceof Error ? err.message : err });
  process.exit(1);
});
