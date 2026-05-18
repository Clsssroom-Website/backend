import { Router } from "express";
import { createClass, updateClass, deleteClass, getAllClasses, getClassById, getClassStudents, getClassStream } from "../controllers/classController.js";
import { getAssignments, createAssignment, updateAssignment, deleteAssignment, deleteAttachment } from "../controllers/assignmentController.js";
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


// POST /api/v1/classes - API tạo lớp học
router.post("/", authMiddleware, createClass);

// PUT /api/v1/classes/:id - API cập nhật lớp học
router.put("/:id", authMiddleware, updateClass);

// DELETE /api/v1/classes/:id - API xóa lớp học
router.delete("/:id", authMiddleware, deleteClass);

// ─── Assignment routes (Teacher) ──────────────────────────────────────────────
// GET  /api/v1/classes/:id/assignments
router.get("/:id/assignments", authMiddleware, getAssignments);

// POST /api/v1/classes/:id/assignments
router.post("/:id/assignments", authMiddleware, createAssignment);

// PUT  /api/v1/classes/:id/assignments/:assignmentId
router.put("/:id/assignments/:assignmentId", authMiddleware, updateAssignment);

// DELETE /api/v1/classes/:id/assignments/:assignmentId
router.delete("/:id/assignments/:assignmentId", authMiddleware, deleteAssignment);

// DELETE /api/v1/classes/:id/assignments/:assignmentId/attachments/:attachmentId
router.delete("/:id/assignments/:assignmentId/attachments/:attachmentId", authMiddleware, deleteAttachment);

export default router;
