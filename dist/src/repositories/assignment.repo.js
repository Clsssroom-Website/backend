import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";
export class AssignmentRepository {
    /**
     * Tạo bài tập mới
     */
    async createAssignment(data) {
        const assignmentId = uuidv4();
        return prisma.assignments.create({
            data: {
                assignmentId,
                classId: data.classId,
                title: data.title,
                description: data.description ?? "",
                deadline: data.deadline,
                typeAssignment: data.typeAssignment ?? "ESSAY",
                status: "ACTIVE",
            },
            include: {
                AssignmentAttachments: true,
            },
        });
    }
    /**
     * Lấy danh sách bài tập của một lớp
     */
    async findAssignmentsByClassId(classId) {
        return prisma.assignments.findMany({
            where: { classId },
            orderBy: { createdAt: "desc" },
            include: {
                AssignmentAttachments: true,
                _count: {
                    select: { Submissions: true },
                },
            },
        });
    }
    /**
     * Lấy chi tiết một bài tập theo ID
     */
    async findAssignmentById(assignmentId) {
        return prisma.assignments.findUnique({
            where: { assignmentId },
            include: {
                AssignmentAttachments: true,
                Classes: {
                    select: { classId: true, className: true, teacherId: true },
                },
            },
        });
    }
    /**
     * Cập nhật thông tin bài tập
     */
    async updateAssignment(assignmentId, data) {
        return prisma.assignments.update({
            where: { assignmentId },
            data,
            include: { AssignmentAttachments: true },
        });
    }
    /**
     * Xóa bài tập
     */
    async deleteAssignment(assignmentId) {
        return prisma.assignments.delete({ where: { assignmentId } });
    }
    /**
     * Thêm nhiều file đính kèm vào bài tập
     */
    async createAttachments(assignmentId, attachments) {
        const data = attachments.map((a) => ({
            attachmentId: uuidv4(),
            assignmentId,
            fileName: a.fileName,
            fileUrl: a.fileUrl,
            fileSize: a.fileSize ? BigInt(a.fileSize) : null,
        }));
        return prisma.assignmentAttachments.createMany({ data });
    }
    /**
     * Xóa một file đính kèm theo ID
     */
    async deleteAttachment(attachmentId) {
        return prisma.assignmentAttachments.delete({ where: { attachmentId } });
    }
    /**
     * Xóa tất cả file đính kèm của một bài tập
     */
    async deleteAllAttachments(assignmentId) {
        return prisma.assignmentAttachments.deleteMany({ where: { assignmentId } });
    }
}
