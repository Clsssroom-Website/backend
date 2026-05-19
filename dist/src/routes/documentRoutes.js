import { Router } from "express";
import { documentController } from "../controllers/documentController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { uploadMultipleDocumentsMiddleware } from "../middlewares/uploadMiddleware.js";
const router = Router();
router.post("/upload", authMiddleware, requireRole(["teacher"]), uploadMultipleDocumentsMiddleware, documentController.upload);
router.get("/class/:classId", authMiddleware, 
// Cả HỌC SINH và GIÁO VIÊN đều được xem (logic kiểm tra ở Service)
documentController.getDocumentsByClassId);
// Route để lấy URL tải file
router.get("/attachment/:attachmentId/download", authMiddleware, documentController.getAttachmentDownloadUrl);
// Route chỉnh sửa tài liệu
router.put("/:documentId", authMiddleware, requireRole(["teacher"]), uploadMultipleDocumentsMiddleware, documentController.update);
// Route xóa tài liệu
router.delete("/:documentId", authMiddleware, requireRole(["teacher"]), documentController.delete);
export default router;
