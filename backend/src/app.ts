import express from "express";

import { loginRouter } from "./routes/loginRoute";
import { userRouter } from "./routes/userRoute";
import { workspaceRouter } from "./routes/workspaceRoute";

import cookieParser from "cookie-parser";
import { configureCORS } from "./configCORS";

const app = express();
configureCORS(app);

// Middleware:
app.use(express.json());
app.use(cookieParser());

// created Routes:
app.use("/api/login", loginRouter);
app.use("/api/user", userRouter);
app.use("/api/workspace", workspaceRouter);

export default app;
