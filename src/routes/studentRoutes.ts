import { Router } from "express";
import {
  joinClass,
  getEnrolledClasses,
  getClassDetails,
  getAssignments,
  submitAssignment,
  submitQuizAssignment,
  getSubmissionAndGrade,
  getDashboard,
  getGrades,
} from "../controllers/studentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadMultipleMiddleware } from "../middlewares/uploadMiddleware.js";
const router = Router();

// GET /api/v1/students/dashboard - Lấy dữ liệu Dashboard cho học sinh
router.get("/dashboard", authMiddleware, getDashboard);

// POST /api/v1/students/classes/join - Học sinh tham gia lớp học
router.post("/classes/join", authMiddleware, joinClass);

// GET /api/v1/students/classes - Lấy danh sách lớp đã tham gia
router.get("/classes", authMiddleware, getEnrolledClasses);

// GET /api/v1/students/classes/:classId - Xem chi tiết lớp học
router.get("/classes/:classId", authMiddleware, getClassDetails);

// GET /api/v1/students/classes/:classId/grades - Xem điểm của học sinh trong lớp học
router.get("/classes/:classId/grades", authMiddleware, getGrades);

// GET /api/v1/students/classes/:classId/assignments - Xem danh sách bài tập của lớp
router.get("/classes/:classId/assignments", authMiddleware, getAssignments);


// POST /api/v1/students/assignments/:assignmentId/submit - Nộp bài tập (file upload)
router.post("/assignments/:assignmentId/submit", authMiddleware, uploadMultipleMiddleware, submitAssignment);

// POST /api/v1/students/assignments/:assignmentId/submit-quiz - Nộp bài trắc nghiệm (JSON, không có file)
router.post("/assignments/:assignmentId/submit-quiz", authMiddleware, submitQuizAssignment);

// GET /api/v1/students/assignments/:assignmentId/submission - Xem bài nộp và điểm
router.get("/assignments/:assignmentId/submission", authMiddleware, getSubmissionAndGrade);

export default router;
