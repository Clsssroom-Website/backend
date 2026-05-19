import { Router } from "express";
import { createClass, updateClass, deleteClass, getAllClasses, getClassById, getClassStudents, getClassStream, removeStudentFromClass } from "../controllers/classController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = Router();
// GET /api/v1/classes - API lấy danh sách lớp học theo teacherId
router.get("/", authMiddleware, getAllClasses);
// GET /api/v1/classes/:id - API lấy chi tiết 1 lớp học
router.get("/:id", authMiddleware, getClassById);
// GET /api/v1/classes/:id/stream - API lấy bảng tin lớp học
router.get("/:id/stream", authMiddleware, getClassStream);
// GET /api/v1/classes/:id/students - API lấy danh sách học sinh của lớp
router.get("/:id/students", authMiddleware, getClassStudents);
// DELETE /api/v1/classes/:id/students/:studentId - API xóa học sinh khỏi lớp
router.delete("/:id/students/:studentId", authMiddleware, removeStudentFromClass);
// POST /api/v1/classes - API tạo lớp học
router.post("/", authMiddleware, createClass);
// PUT /api/v1/classes/:id - API cập nhật lớp học
router.put("/:id", authMiddleware, updateClass);
// DELETE /api/v1/classes/:id - API xóa lớp học
router.delete("/:id", authMiddleware, deleteClass);
export default router;
