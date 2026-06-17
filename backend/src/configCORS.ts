import express from "express";
import cors, { CorsOptions } from "cors";

export function configureCORS(app: express.Express) {
  const corsOptions: CorsOptions = {
    origin: process.env.CORS_ORIGIN ?? "https://localhost:8080",
    methods: "GET,PUT,POST,DELETE",
    allowedHeaders: "Origin,Content-Type",
    optionsSuccessStatus: 200,
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.options(/.*/, cors());
}
