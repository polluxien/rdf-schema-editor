import express, { type Request, type Response, type NextFunction } from "express";

import { loginRouter } from "./routes/loginRoute";
import { userRouter } from "./routes/userRoute";
import { workspaceRouter } from "./routes/workspaceRoute";
import { rdfExportRouter } from "./routes/rdfExportRoute";

import cookieParser from "cookie-parser";
import { configureCORS } from "./configCORS";
import { logger } from "./logger";

const app = express();
configureCORS(app);

// Middleware
app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());

// HTTP request logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR"
                : res.statusCode >= 400 ? "WARN"
                : "INFO";
    // originalUrl (not req.path): Express strips the mount-point prefix from
    // req.url while inside a sub-router and only restores it when next() is
    // called, which never happens once a handler responds directly — path
    // would otherwise log as e.g. "/<id>" instead of "/api/workspaces/<id>"
    logger[level === "INFO" ? "info" : level === "WARN" ? "warn" : "error"](
      `${req.method} ${req.originalUrl} → ${res.statusCode} (${ms}ms)`,
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
app.use("/api/users", userRouter);  
app.use("/api/workspaces", workspaceRouter);
app.use("/api/export", rdfExportRouter);

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    (err as { status?: number; statusCode?: number })?.status ??
    (err as { status?: number; statusCode?: number })?.statusCode ??
    500;
  logger.error("Unhandled error in request", { message, status });
  res.status(status).json({ error: message });
});

export default app;
