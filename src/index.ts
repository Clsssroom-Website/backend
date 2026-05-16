import express, { type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import errorHandler from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const app = express();

// ─── CORS: allow credentials from the frontend origin ───────────────────────
const allowedOrigin = process.env.FRONTEND_URL ?? "http://localhost:5173";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true, // required so the browser sends HttpOnly cookies
  })
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Cookie parser: populates req.cookies ─────────────────────────────────────
app.use(cookieParser());

// ─── Request logger ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "🎓 Classroom Website API đang hoạt động!" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/classes", classRoutes);

// Mount notFoundHandler after all route registrations
app.use(notFoundHandler);

// Mount the global error handler as the absolute last middleware
app.use(errorHandler);

export default app;
