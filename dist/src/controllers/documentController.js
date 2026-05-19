import { DocumentService } from "../services/document.service.js";
import { uploadDocumentSchema } from "../validators/document.validator.js";
import { ValidationError, BadRequestError } from "../errors/index.js";
const documentService = new DocumentService();
export class DocumentController {
    async upload(req, res, next) {
        try {
            // 1. Zod Validation for body
            const parsed = uploadDocumentSchema.safeParse({ body: req.body });
            if (!parsed.success) {
                throw new ValidationError("Dữ liệu đầu vào không hợp lệ", parsed.error.issues);
            }
            const { classId, title, description } = parsed.data.body;
            // 2. Check file existence
            const file = req.file;
            if (!file) {
                throw new BadRequestError("Vui lòng đính kèm một tệp tài liệu.");
            }
            const userId = req.user.userId;
            // 3. Call Service
            const document = await documentService.uploadDocument(userId, classId, title, description, file.buffer, file.originalname, file.mimetype, file.size);
            res.status(201).json({
                success: true,
                message: "Tải tài liệu lên thành công.",
                data: document,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getDocumentsByClassId(req, res, next) {
        try {
            const classId = req.params.classId;
            if (!classId) {
                throw new BadRequestError("classId là bắt buộc trong URL.");
            }
            const userId = req.user.userId;
            const documents = await documentService.getDocumentsByClassId(userId, classId);
            res.status(200).json({
                success: true,
                data: documents,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getDownloadUrl(req, res, next) {
        try {
            const documentId = req.params.documentId;
            if (!documentId) {
                throw new BadRequestError("documentId là bắt buộc trong URL.");
            }
            const userId = req.user.userId;
            const action = req.query.action;
            const downloadUrl = await documentService.getDownloadUrl(userId, documentId, action);
            res.status(200).json({
                success: true,
                data: downloadUrl,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const documentController = new DocumentController();
