import express, { type Request, type Response, type NextFunction } from "express";

import { loginRouter } from "./routes/loginRoute";
import { userRouter } from "./routes/userRoute";
import { workspaceRouter } from "./routes/workspaceRoute";

import cookieParser from "cookie-parser";
import { configureCORS } from "./configCORS";
import { logger } from "./logger";

const app = express();
configureCORS(app);

// Middleware
app.use(express.json());
app.use(cookieParser());

// HTTP request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR"
                : res.statusCode >= 400 ? "WARN"
                : "INFO";
    logger[level === "INFO" ? "info" : level === "WARN" ? "warn" : "error"](
      `${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`,
    );
  });
  next();
});

// Health check
app.get("/api/healthy", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Routes
app.use("/api/login", loginRouter);
app.use("/api/users", userRouter);       // war: /api/user  (Tippfehler)
app.use("/api/workspace", workspaceRouter);

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error("Unhandled error in request", { message });
  res.status(500).json({ error: message });
});

export default app;
