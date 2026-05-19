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
            const files = req.files;
            if (!files || files.length === 0) {
                throw new BadRequestError("Vui lòng đính kèm ít nhất một tệp tài liệu.");
            }
            const userId = req.user.userId;
            // 3. Call Service
            const document = await documentService.uploadDocument(userId, classId, title, description, files);
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
    async getAttachmentDownloadUrl(req, res, next) {
        try {
            const attachmentId = req.params.attachmentId;
            if (!attachmentId) {
                throw new BadRequestError("attachmentId là bắt buộc trong URL.");
            }
            const userId = req.user.userId;
            const action = req.query.action;
            const downloadUrl = await documentService.getAttachmentDownloadUrl(userId, attachmentId, action);
            res.status(200).json({
                success: true,
                data: downloadUrl,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const documentId = req.params.documentId;
            if (!documentId) {
                throw new BadRequestError("documentId là bắt buộc trong URL.");
            }
            const { title, description } = req.body;
            let keepAttachmentIds;
            if (req.body.keepAttachmentIds !== undefined) {
                keepAttachmentIds =
                    typeof req.body.keepAttachmentIds === "string"
                        ? JSON.parse(req.body.keepAttachmentIds)
                        : req.body.keepAttachmentIds;
            }
            const files = req.files;
            const userId = req.user.userId;
            const document = await documentService.updateDocument(userId, documentId, {
                title,
                description,
                keepAttachmentIds,
                files,
            });
            res.status(200).json({
                success: true,
                message: "Cập nhật tài liệu thành công.",
                data: document,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const documentId = req.params.documentId;
            if (!documentId) {
                throw new BadRequestError("documentId là bắt buộc trong URL.");
            }
            const userId = req.user.userId;
            await documentService.deleteDocument(userId, documentId);
            res.status(200).json({
                success: true,
                message: "Xóa tài liệu thành công.",
            });
        }
        catch (error) {
            next(error);
        }
    }
}
export const documentController = new DocumentController();
