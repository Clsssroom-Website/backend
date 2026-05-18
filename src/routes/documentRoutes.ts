import { Router } from "express";
import { documentController } from "../controllers/documentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { uploadDocumentMiddleware } from "../middlewares/uploadMiddleware.js";

const router = Router();

router.post(
  "/upload",
  authMiddleware,
  requireRole(["TEACHER"]),
  uploadDocumentMiddleware,
  documentController.upload
);

export default router;
