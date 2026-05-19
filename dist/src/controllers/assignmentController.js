import { AssignmentService } from "../services/assignment.service.js";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors/index.js";
const assignmentService = new AssignmentService();
/**
 * Helper: Lấy teacherId và xác thực role teacher
 */
const ensureTeacher = (req) => {
    const user = req.user;
    if (!user?.userId)
        throw new UnauthorizedError("Vui lòng đăng nhập.");
    if (user.role !== "teacher")
        throw new ForbiddenError("Chỉ Giáo viên mới được thực hiện hành động này.");
    return user.userId;
};
export class AssignmentController {
    /**
     * GET /api/v1/classes/:id/assignments
     * Teacher lấy danh sách bài tập của lớp
     */
    async getAssignments(req, res, next) {
        try {
            const teacherId = ensureTeacher(req);
            const classId = req.params.id;
            const assignments = await assignmentService.getAssignmentsByClassId(teacherId, classId);
            res.status(200).json({
                success: true,
                message: "Lấy danh sách bài tập thành công!",
                data: assignments,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/classes/:id/assignments
     * Teacher tạo bài tập mới (có thể kèm file đính kèm)
     */
    async createAssignment(req, res, next) {
        try {
            const teacherId = ensureTeacher(req);
            const classId = req.params.id;
            const { title, description, deadline, typeAssignment } = req.body;
            if (!title || String(title).trim() === "") {
                throw new BadRequestError("Tiêu đề bài tập không được để trống.");
            }
            if (!deadline) {
                throw new BadRequestError("Hạn nộp bài không được để trống.");
            }
            const files = req.files;
            const assignment = await assignmentService.createAssignment(teacherId, classId, {
                title,
                description,
                deadline,
                typeAssignment,
                files,
            });
            res.status(201).json({
                success: true,
                message: "Tạo bài tập thành công!",
                data: assignment,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /api/v1/classes/:id/assignments/:assignmentId
     * Teacher cập nhật bài tập
     * Body: { title?, description?, deadline?, typeAssignment?, keepAttachmentIds?: string[] }
     * Files: multipart/form-data với field "attachments"
     */
    async updateAssignment(req, res, next) {
        try {
            const teacherId = ensureTeacher(req);
            const assignmentId = req.params.assignmentId;
            const { title, description, deadline, typeAssignment } = req.body;
            // Danh sách attachment IDs muốn giữ lại (gửi từ frontend)
            let keepAttachmentIds;
            if (req.body.keepAttachmentIds !== undefined) {
                keepAttachmentIds =
                    typeof req.body.keepAttachmentIds === "string"
                        ? JSON.parse(req.body.keepAttachmentIds)
                        : req.body.keepAttachmentIds;
            }
            const files = req.files;
            const updated = await assignmentService.updateAssignment(teacherId, assignmentId, {
                title,
                description,
                deadline,
                typeAssignment,
                keepAttachmentIds,
                files,
            });
            res.status(200).json({
                success: true,
                message: "Cập nhật bài tập thành công!",
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/v1/classes/:id/assignments/:assignmentId
     * Teacher xóa bài tập (kèm tất cả file trên MinIO)
     */
    async deleteAssignment(req, res, next) {
        try {
            const teacherId = ensureTeacher(req);
            const assignmentId = req.params.assignmentId;
            await assignmentService.deleteAssignment(teacherId, assignmentId);
            res.status(200).json({ success: true, message: "Xóa bài tập thành công!" });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/v1/classes/:id/assignments/:assignmentId/attachments/:attachmentId
     * Teacher xóa một file đính kèm của bài tập (kèm file trên MinIO)
     */
    async deleteAttachment(req, res, next) {
        try {
            const teacherId = ensureTeacher(req);
            const assignmentId = req.params.assignmentId;
            const attachmentId = req.params.attachmentId;
            await assignmentService.deleteAttachment(teacherId, assignmentId, attachmentId);
            res.status(200).json({ success: true, message: "Xóa file đính kèm thành công!" });
        }
        catch (error) {
            next(error);
        }
    }
}
export const assignmentController = new AssignmentController();
