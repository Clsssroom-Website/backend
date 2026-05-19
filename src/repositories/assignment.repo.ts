import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";

export class AssignmentRepository {
  /**
   * Tạo bài tập mới
   */
  public async createAssignment(data: {
    classId: string;
    title: string;
    description?: string;
    deadline: Date;
    typeAssignment?: string;
  }) {
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
  public async findAssignmentsByClassId(classId: string) {
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
  public async findAssignmentById(assignmentId: string) {
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
  public async updateAssignment(
    assignmentId: string,
    data: {
      title?: string;
      description?: string;
      deadline?: Date;
      typeAssignment?: string;
      status?: string;
    }
  ) {
    return prisma.assignments.update({
      where: { assignmentId },
      data,
      include: { AssignmentAttachments: true },
    });
  }

  /**
   * Xóa bài tập
   */
  public async deleteAssignment(assignmentId: string) {
    return prisma.assignments.delete({ where: { assignmentId } });
  }

  /**
   * Thêm nhiều file đính kèm vào bài tập
   */
  public async createAttachments(
    assignmentId: string,
    attachments: { fileName: string; fileUrl: string; fileSize?: number }[]
  ) {
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
  public async deleteAttachment(attachmentId: string) {
    return prisma.assignmentAttachments.delete({ where: { attachmentId } });
  }

  /**
   * Xóa tất cả file đính kèm của một bài tập
   */
  public async deleteAllAttachments(assignmentId: string) {
    return prisma.assignmentAttachments.deleteMany({ where: { assignmentId } });
  }

  /**
   * Lấy danh sách bài nộp của bài tập
   */
  public async findSubmissionsByAssignmentId(assignmentId: string) {
    return prisma.submissions.findMany({
      where: { assignmentId },
      include: {
        Users: {
          select: {
            userId: true,
            name: true,
            email: true,
          },
        },
        SubmissionAttachments: true,
        Grades: true,
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  /**
   * Tạo hoặc cập nhật điểm số cho bài nộp
   */
  public async upsertGrade(payload: {
    submissionId: string;
    studentId: string;
    classId: string;
    assignmentId: string;
    score: number;
    comment?: string;
  }) {
    const { submissionId, studentId, classId, assignmentId, score, comment } = payload;
    
    // Tìm xem đã có Grade nào cho submissionId chưa
    const existingGrade = await prisma.grades.findFirst({
      where: { submissionId }
    });

    if (existingGrade) {
      return prisma.grades.update({
        where: { gradeId: existingGrade.gradeId },
        data: {
          score,
          comment,
          gradedAt: new Date()
        }
      });
    } else {
      return prisma.grades.create({
        data: {
          gradeId: uuidv4(),
          submissionId,
          studentId,
          classId,
          assignmentId,
          score,
          comment,
          gradedAt: new Date()
        }
      });
    }
  }
}
