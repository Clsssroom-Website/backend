import { AssignmentRepository } from "../repositories/assignment.repo.js";
import { MinioStorageService } from "./storage/minioStorage.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";
import prisma from "../config/prisma.js";
export class AssignmentService {
    assignmentRepo;
    storageService;
    constructor() {
        this.assignmentRepo = new AssignmentRepository();
        this.storageService = new MinioStorageService("classroom-assignments");
    }
    // ─── Helper: kiểm tra teacher có quyền trên bài tập ──────────────────────────
    async ensureTeacherOwnsAssignment(teacherId, assignmentId) {
        const assignment = await this.assignmentRepo.findAssignmentById(assignmentId);
        if (!assignment)
            throw new NotFoundError("Không tìm thấy bài tập.");
        const cls = assignment.Classes;
        if (cls?.teacherId !== teacherId) {
            throw new ForbiddenError("Bạn không có quyền thao tác với bài tập này.");
        }
        return assignment;
    }
    // ─── Helper: serialize BigInt trong attachments và map URL ───────────────────
    async serializeAttachments(assignment) {
        if (!assignment)
            return assignment;
        let processedAttachments = [];
        if (assignment.AssignmentAttachments && assignment.AssignmentAttachments.length > 0) {
            processedAttachments = await Promise.all(assignment.AssignmentAttachments.map(async (att) => {
                let presignedUrl = att.fileUrl;
                try {
                    presignedUrl = await this.storageService.getPresignedUrl(att.fileUrl, false, att.fileName || "download");
                }
                catch (err) {
                    console.warn("Could not generate presigned URL for", att.fileUrl);
                }
                return {
                    ...att,
                    fileSize: att.fileSize != null ? att.fileSize.toString() : null,
                    fileUrl: presignedUrl, // Thay fileUrl bằng link tải để FE click tải được
                };
            }));
        }
        return {
            ...assignment,
            AssignmentAttachments: processedAttachments,
        };
    }
    /**
     * Tạo bài tập mới — chỉ teacher sở hữu lớp mới được tạo
     */
    async createAssignment(teacherId, classId, data) {
        // 1. Kiểm tra lớp tồn tại
        const classRecord = await prisma.classes.findUnique({
            where: { classId },
            select: { teacherId: true },
        });
        if (!classRecord)
            throw new NotFoundError("Không tìm thấy lớp học.");
        // 2. Kiểm tra teacher có phải chủ lớp không
        if (classRecord.teacherId !== teacherId) {
            throw new ForbiddenError("Bạn không có quyền giao bài cho lớp học này.");
        }
        // 3. Validate title
        if (!data.title || data.title.trim() === "") {
            throw new BadRequestError("Tiêu đề bài tập không được để trống.");
        }
        // 4. Validate deadline
        const deadlineDate = new Date(data.deadline);
        if (isNaN(deadlineDate.getTime())) {
            throw new BadRequestError("Hạn nộp không hợp lệ.");
        }
        // 5. Tạo bài tập
        const assignment = await this.assignmentRepo.createAssignment({
            classId,
            title: data.title.trim(),
            description: data.description?.trim(),
            deadline: deadlineDate,
            typeAssignment: data.typeAssignment ?? "ESSAY",
        });
        // 6. Upload files lên MinIO và tạo attachments
        if (data.files && data.files.length > 0) {
            const attachmentsToCreate = [];
            for (const file of data.files) {
                if (!file.buffer || file.buffer.length === 0) {
                    throw new BadRequestError(`File "${file.originalname}" không hợp lệ hoặc rỗng.`);
                }
                const uploadResult = await this.storageService.uploadFile(file.buffer, file.originalname, file.mimetype);
                attachmentsToCreate.push({
                    fileName: file.originalname,
                    fileUrl: uploadResult.url,
                    fileSize: uploadResult.size,
                });
            }
            await this.assignmentRepo.createAttachments(assignment.assignmentId, attachmentsToCreate);
        }
        // 7. Fetch lại để trả về đầy đủ kèm attachments
        const created = await this.assignmentRepo.findAssignmentById(assignment.assignmentId);
        return await this.serializeAttachments(created);
    }
    /**
     * Lấy danh sách bài tập của lớp — teacher sở hữu lớp
     */
    async getAssignmentsByClassId(teacherId, classId) {
        const classRecord = await prisma.classes.findUnique({
            where: { classId },
            select: { teacherId: true },
        });
        if (!classRecord)
            throw new NotFoundError("Không tìm thấy lớp học.");
        if (classRecord.teacherId !== teacherId) {
            throw new ForbiddenError("Bạn không có quyền xem bài tập của lớp học này.");
        }
        const assignments = await this.assignmentRepo.findAssignmentsByClassId(classId);
        const serializedAssignments = await Promise.all(assignments.map(async (a) => {
            const serialized = await this.serializeAttachments(a);
            return {
                ...serialized,
                totalSubmissions: a._count?.Submissions ?? 0,
                _count: undefined,
            };
        }));
        return serializedAssignments;
    }
    /**
     * Cập nhật bài tập — chỉ teacher sở hữu lớp
     */
    async updateAssignment(teacherId, assignmentId, data) {
        const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);
        // Validate
        if (data.title !== undefined && data.title.trim() === "") {
            throw new BadRequestError("Tiêu đề không được để trống.");
        }
        let deadlineDate;
        if (data.deadline) {
            deadlineDate = new Date(data.deadline);
            if (isNaN(deadlineDate.getTime()))
                throw new BadRequestError("Hạn nộp không hợp lệ.");
        }
        // Cập nhật thông tin bài tập
        await this.assignmentRepo.updateAssignment(assignmentId, {
            title: data.title?.trim(),
            description: data.description?.trim(),
            deadline: deadlineDate,
            typeAssignment: data.typeAssignment,
        });
        // Nếu có thay đổi về attachments (giữ lại hoặc thêm mới)
        const hasNewFiles = data.files && data.files.length > 0;
        const isManagingAttachments = data.keepAttachmentIds !== undefined || hasNewFiles;
        if (isManagingAttachments) {
            const oldAttachments = assignment.AssignmentAttachments || [];
            const keepIds = data.keepAttachmentIds ?? [];
            // Xóa khỏi MinIO các file không được giữ lại
            for (const old of oldAttachments) {
                if (!keepIds.includes(old.attachmentId) && old.fileUrl) {
                    await this.storageService.deleteFile(old.fileUrl);
                }
            }
            // Xóa tất cả attachments cũ trong DB
            await this.assignmentRepo.deleteAllAttachments(assignmentId);
            // Tái tạo: giữ lại các attachment cũ được chỉ định
            const attachmentsToCreate = [];
            for (const old of oldAttachments) {
                if (keepIds.includes(old.attachmentId)) {
                    attachmentsToCreate.push({
                        fileName: old.fileName,
                        fileUrl: old.fileUrl,
                        fileSize: old.fileSize ? Number(old.fileSize) : undefined,
                    });
                }
            }
            // Upload files mới lên MinIO
            if (hasNewFiles) {
                for (const file of data.files) {
                    if (!file.buffer || file.buffer.length === 0) {
                        throw new BadRequestError(`File "${file.originalname}" không hợp lệ hoặc rỗng.`);
                    }
                    const uploadResult = await this.storageService.uploadFile(file.buffer, file.originalname, file.mimetype);
                    attachmentsToCreate.push({
                        fileName: file.originalname,
                        fileUrl: uploadResult.url,
                        fileSize: uploadResult.size,
                    });
                }
            }
            if (attachmentsToCreate.length > 0) {
                await this.assignmentRepo.createAttachments(assignmentId, attachmentsToCreate);
            }
        }
        const updated = await this.assignmentRepo.findAssignmentById(assignmentId);
        return await this.serializeAttachments(updated);
    }
    /**
     * Xóa một file đính kèm đơn lẻ
     */
    async deleteAttachment(teacherId, assignmentId, attachmentId) {
        const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);
        const attachment = assignment.AssignmentAttachments?.find((a) => a.attachmentId === attachmentId);
        if (!attachment)
            throw new NotFoundError("Không tìm thấy file đính kèm.");
        if (attachment.fileUrl) {
            await this.storageService.deleteFile(attachment.fileUrl);
        }
        return this.assignmentRepo.deleteAttachment(attachmentId);
    }
    /**
     * Xóa bài tập — chỉ teacher sở hữu lớp
     */
    async deleteAssignment(teacherId, assignmentId) {
        const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);
        // Xóa tất cả file trên MinIO trước
        for (const attachment of assignment.AssignmentAttachments ?? []) {
            if (attachment.fileUrl) {
                await this.storageService.deleteFile(attachment.fileUrl);
            }
        }
        await this.assignmentRepo.deleteAllAttachments(assignmentId);
        return this.assignmentRepo.deleteAssignment(assignmentId);
    }
}
export const assignmentService = new AssignmentService();
