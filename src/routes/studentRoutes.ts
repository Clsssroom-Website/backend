import { Router } from "express";
import {
  joinClass,
  getEnrolledClasses,
  getClassDetails,
  getAssignments,
  submitAssignment,
  getSubmissionAndGrade,
} from "../controllers/studentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/v1/students/classes/join - Học sinh tham gia lớp học
router.post("/classes/join", authMiddleware, joinClass);

// GET /api/v1/students/classes - Lấy danh sách lớp đã tham gia
router.get("/classes", authMiddleware, getEnrolledClasses);

// GET /api/v1/students/classes/:classId - Xem chi tiết lớp học
router.get("/classes/:classId", authMiddleware, getClassDetails);

// GET /api/v1/students/classes/:classId/assignments - Xem danh sách bài tập của lớp
router.get("/classes/:classId/assignments", authMiddleware, getAssignments);

// POST /api/v1/students/assignments/:assignmentId/submit - Nộp bài tập
router.post("/assignments/:assignmentId/submit", authMiddleware, submitAssignment);

// GET /api/v1/students/assignments/:assignmentId/submission - Xem bài nộp và điểm
router.get("/assignments/:assignmentId/submission", authMiddleware, getSubmissionAndGrade);

export default router;
