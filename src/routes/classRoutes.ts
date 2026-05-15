import { Router } from "express";
import { createClass } from "../controllers/classController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/v1/classes - API tạo lớp học (yêu cầu đăng nhập & role teacher)
router.post("/", authMiddleware, createClass);

export default router;
