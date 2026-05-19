import { Router } from "express";
import { documentController } from "../controllers/documentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { uploadDocumentMiddleware } from "../middlewares/uploadMiddleware.js";
const router = Router();
router.post("/upload", authMiddleware, requireRole(["teacher"]), uploadDocumentMiddleware, documentController.upload);
router.get("/class/:classId", authMiddleware, 
// Cả HỌC SINH và GIÁO VIÊN đều được xem (logic kiểm tra ở Service)
documentController.getDocumentsByClassId);
// Route để lấy URL tải file
router.get("/:documentId/download", authMiddleware, documentController.getDownloadUrl);
export default router;
