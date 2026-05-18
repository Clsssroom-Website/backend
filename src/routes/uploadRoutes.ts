import { Router } from "express";
import { uploadFile } from "../controllers/uploadController.js";
import { upload1 } from "../middlewares/uploadMiddleware.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/v1/upload
// Chỉ cho phép user đã đăng nhập upload file (giáo viên hoặc học sinh).
// Sử dụng upload.single("file") nghĩa là frontend gửi FormData với key "file".
router.post("/", authMiddleware, upload1.single("file"), uploadFile);

export default router;
