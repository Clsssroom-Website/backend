import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import errorHandler from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "🎓 Classroom Website API đang hoạt động!" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

// Mount notFoundHandler after all route registrations
app.use(notFoundHandler);

// Mount the global error handler as the absolute last middleware
app.use(errorHandler);

export default app;
