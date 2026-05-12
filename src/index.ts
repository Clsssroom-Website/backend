import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import errorHandler from "./middlewares/errorHandler.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "🎓 Classroom Website API đang hoạt động!" });
});

app.use("/api/v1/users", userRoutes);
app.use(errorHandler);

export default app;
