import { Router } from "express";
import { createClass, updateClass, deleteClass, getAllClasses } from "../controllers/classController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/v1/classes - API lấy danh sách lớp học theo teacherId
router.get("/", authMiddleware, getAllClasses);

// POST /api/v1/classes - API tạo lớp học
router.post("/", authMiddleware, createClass);

// PUT /api/v1/classes/:id - API cập nhật lớp học
router.put("/:id", authMiddleware, updateClass);

// DELETE /api/v1/classes/:id - API xóa lớp học
router.delete("/:id", authMiddleware, deleteClass);

export default router;
