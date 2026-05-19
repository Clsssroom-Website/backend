
import { Router } from "express";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { uploadMultipleMiddleware } from "../middlewares/uploadMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { assignmentController } from "../controllers/assignmentController.js";

const router = Router();

router.get("/:id/assignments", authMiddleware, assignmentController.getAssignments.bind(assignmentController));

// POST /api/v1/classes/:id/assignments
router.post(
  "/:id/assignments",
  authMiddleware,
  requireRole(["teacher"]),
  uploadMultipleMiddleware,
  assignmentController.createAssignment.bind(assignmentController)
);

// PUT  /api/v1/classes/:id/assignments/:assignmentId
router.put(
  "/:id/assignments/:assignmentId",
  authMiddleware,
  requireRole(["teacher"]),
  uploadMultipleMiddleware,
  assignmentController.updateAssignment.bind(assignmentController)
);

// DELETE /api/v1/classes/:id/assignments/:assignmentId
router.delete(
  "/:id/assignments/:assignmentId",
  authMiddleware,
  requireRole(["teacher"]),
  assignmentController.deleteAssignment.bind(assignmentController)
);

// DELETE /api/v1/classes/:id/assignments/:assignmentId/attachments/:attachmentId
router.delete(
  "/:id/assignments/:assignmentId/attachments/:attachmentId",
  authMiddleware,
  requireRole(["teacher"]),
  assignmentController.deleteAttachment.bind(assignmentController)
);

// GET /api/v1/classes/:id/assignments/:assignmentId/submissions
router.get(
  "/:id/assignments/:assignmentId/submissions",
  authMiddleware,
  requireRole(["teacher"]),
  assignmentController.getSubmissions.bind(assignmentController)
);

// POST /api/v1/classes/:id/assignments/:assignmentId/submissions/:submissionId/grade
router.post(
  "/:id/assignments/:assignmentId/submissions/:submissionId/grade",
  authMiddleware,
  requireRole(["teacher"]),
  assignmentController.gradeSubmission.bind(assignmentController)
);

export default router;