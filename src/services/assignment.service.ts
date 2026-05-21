import { AssignmentRepository } from "../repositories/assignment.repo.js";
import { MinioStorageService, IStorageService } from "./storage/minioStorage.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";
import prisma from "../config/prisma.js";
import { eventBus } from "../events/eventBus.js";

export class AssignmentService {
  private assignmentRepo: AssignmentRepository;
  private storageService: IStorageService;

  constructor() {
    this.assignmentRepo = new AssignmentRepository();
    this.storageService = new MinioStorageService("classroom-assignments");
  }

  // ─── Helper: kiểm tra teacher có quyền trên bài tập ──────────────────────────
  private async ensureTeacherOwnsAssignment(teacherId: string, assignmentId: string) {
    const assignment = await this.assignmentRepo.findAssignmentById(assignmentId);
    if (!assignment) throw new NotFoundError("Không tìm thấy bài tập.");
    const cls = assignment.Classes as any;
    if (cls?.teacherId !== teacherId) {
      throw new ForbiddenError("Bạn không có quyền thao tác với bài tập này.");
    }
    return assignment;
  }

  // ─── Helper: serialize BigInt trong attachments và map URL ───────────────────
  private async serializeAttachments(assignment: any) {
    if (!assignment) return assignment;
    
    let processedAttachments = [];
    if (assignment.AssignmentAttachments && assignment.AssignmentAttachments.length > 0) {
      processedAttachments = await Promise.all(
        assignment.AssignmentAttachments.map(async (att: any) => {
          let presignedUrl = att.fileUrl;
          let downloadUrl = att.fileUrl;
          try {
            presignedUrl = await this.storageService.getPresignedUrl(att.fileUrl, false, att.fileName || "download");
            downloadUrl = await this.storageService.getPresignedUrl(att.fileUrl, true, att.fileName || "download");
          } catch (err) {
            console.warn("Could not generate presigned URL for", att.fileUrl);
          }
          return {
            ...att,
            fileSize: att.fileSize != null ? att.fileSize.toString() : null,
            fileUrl: presignedUrl, // Link xem online
            downloadUrl: downloadUrl, // Link tải xuống trực tiếp
          };
        })
      );
    }

    return {
      ...assignment,
      AssignmentAttachments: processedAttachments,
    };
  }

  /**
   * Tạo bài tập mới — chỉ teacher sở hữu lớp mới được tạo
   */
  public async createAssignment(
    teacherId: string,
    classId: string,
    data: {
      title: string;
      description?: string;
      deadline: string; // ISO string từ frontend
      typeAssignment?: string;
      quizUrl?: string;
      quizData?: string;
      files?: Express.Multer.File[];
    }
  ) {
    // 1. Kiểm tra lớp tồn tại
    const classRecord = await prisma.classes.findUnique({
      where: { classId },
      select: { teacherId: true, className: true },
    });
    if (!classRecord) throw new NotFoundError("Không tìm thấy lớp học.");

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

    // Lấy tên và email giáo viên
    const teacherRecord = await prisma.users.findUnique({
      where: { userId: teacherId },
      select: { name: true, email: true },
    });
    const teacherName = teacherRecord?.name || "Giáo viên";

    let quizUrl = data.quizUrl;
    let quizData = data.quizData;

    // 5. Tạo bài tập
    const assignment = await this.assignmentRepo.createAssignment({
      classId,
      title: data.title.trim(),
      description: data.description?.trim(),
      deadline: deadlineDate,
      typeAssignment: data.typeAssignment ?? "ESSAY",
      quizUrl: quizUrl,
      quizData: quizData,
    });

    // Phát sự kiện assignment.created
    eventBus.emit("assignment.created", {
      assignmentId: assignment.assignmentId,
      classId,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      className: classRecord.className,
      teacherName,
    });

    // 6. Upload files lên MinIO và tạo attachments
    if (data.files && data.files.length > 0) {
      const attachmentsToCreate: { fileName: string; fileUrl: string; fileSize?: number }[] = [];

      for (const file of data.files) {
        if (!file.buffer || file.buffer.length === 0) {
          throw new BadRequestError(`File "${file.originalname}" không hợp lệ hoặc rỗng.`);
        }
        const uploadResult = await this.storageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );
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
  public async getAssignmentsByClassId(teacherId: string, classId: string) {
    const classRecord = await prisma.classes.findUnique({
      where: { classId },
      select: { teacherId: true },
    });
    if (!classRecord) throw new NotFoundError("Không tìm thấy lớp học.");
    if (classRecord.teacherId !== teacherId) {
      throw new ForbiddenError("Bạn không có quyền xem bài tập của lớp học này.");
    }

    const assignments = await this.assignmentRepo.findAssignmentsByClassId(classId);
    const serializedAssignments = await Promise.all(
      assignments.map(async (a: any) => {
        const serialized = await this.serializeAttachments(a);
        return {
          ...serialized,
          totalSubmissions: a._count?.Submissions ?? 0,
          _count: undefined,
        };
      })
    );
    return serializedAssignments;
  }

  /**
   * Cập nhật bài tập — chỉ teacher sở hữu lớp
   */
  public async updateAssignment(
    teacherId: string,
    assignmentId: string,
    data: {
      title?: string;
      description?: string;
      deadline?: string;
      typeAssignment?: string;
      quizUrl?: string;
      quizData?: string;
      keepAttachmentIds?: string[]; // IDs của attachments cũ muốn giữ lại
      files?: Express.Multer.File[];
    }
  ) {
    const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);

    // Validate
    if (data.title !== undefined && data.title.trim() === "") {
      throw new BadRequestError("Tiêu đề không được để trống.");
    }

    let deadlineDate: Date | undefined;
    if (data.deadline) {
      deadlineDate = new Date(data.deadline);
      if (isNaN(deadlineDate.getTime())) throw new BadRequestError("Hạn nộp không hợp lệ.");
    }

    let quizUrl = data.quizUrl;
    let quizData = data.quizData;

    // Cập nhật thông tin bài tập
    await this.assignmentRepo.updateAssignment(assignmentId, {
      title: data.title?.trim(),
      description: data.description?.trim(),
      deadline: deadlineDate,
      typeAssignment: data.typeAssignment,
      quizUrl: quizUrl,
      quizData: quizData,
    });

    // Nếu có thay đổi về attachments (giữ lại hoặc thêm mới)
    const hasNewFiles = data.files && data.files.length > 0;
    const isManagingAttachments = data.keepAttachmentIds !== undefined || hasNewFiles;

    if (isManagingAttachments) {
      const oldAttachments = (assignment.AssignmentAttachments as any[]) || [];
      const keepIds = data.keepAttachmentIds ?? [];

      // Xóa khỏi MinIO các file không được giữ lại
      for (const old of oldAttachments) {
        if (!keepIds.includes(old.attachmentId) && old.fileUrl) {
          await (this.storageService as MinioStorageService).deleteFile(old.fileUrl);
        }
      }

      // Xóa tất cả attachments cũ trong DB
      await this.assignmentRepo.deleteAllAttachments(assignmentId);

      // Tái tạo: giữ lại các attachment cũ được chỉ định
      const attachmentsToCreate: { fileName: string; fileUrl: string; fileSize?: number }[] = [];

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
        for (const file of data.files!) {
          if (!file.buffer || file.buffer.length === 0) {
            throw new BadRequestError(`File "${file.originalname}" không hợp lệ hoặc rỗng.`);
          }
          const uploadResult = await this.storageService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype
          );
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
  public async deleteAttachment(teacherId: string, assignmentId: string, attachmentId: string) {
    const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);

    const attachment = (assignment.AssignmentAttachments as any[])?.find(
      (a) => a.attachmentId === attachmentId
    );
    if (!attachment) throw new NotFoundError("Không tìm thấy file đính kèm.");

    if (attachment.fileUrl) {
      await (this.storageService as MinioStorageService).deleteFile(attachment.fileUrl);
    }

    return this.assignmentRepo.deleteAttachment(attachmentId);
  }

  /**
   * Xóa bài tập — chỉ teacher sở hữu lớp
   */
  public async deleteAssignment(teacherId: string, assignmentId: string) {
    const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);

    // Xóa tất cả file trên MinIO trước
    for (const attachment of (assignment.AssignmentAttachments as any[]) ?? []) {
      if (attachment.fileUrl) {
        await (this.storageService as MinioStorageService).deleteFile(attachment.fileUrl);
      }
    }

    await this.assignmentRepo.deleteAllAttachments(assignmentId);
    return this.assignmentRepo.deleteAssignment(assignmentId);
  }

  /**
   * Lấy danh sách bài nộp của bài tập (chỉ dành cho giáo viên)
   */
  public async getSubmissionsByAssignmentId(teacherId: string, assignmentId: string) {
    // 1. Kiểm tra giáo viên sở hữu bài tập
    await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);

    // 2. Lấy danh sách bài nộp từ repo
    const submissions = await this.assignmentRepo.findSubmissionsByAssignmentId(assignmentId);

    // 3. Tạo instance MinioStorageService cho submissions để sinh presigned URL
    const submissionStorageService = new MinioStorageService("classroom-submissions");

    // 4. Map và serialize dữ liệu (BigInt to string cho fileSize, sinh presignedUrl cho attachments)
    const serializedSubmissions = await Promise.all(
      submissions.map(async (sub: any) => {
        const processedAttachments = await Promise.all(
          sub.SubmissionAttachments.map(async (att: any) => {
            let presignedUrl = att.fileUri;
            let downloadUrl = att.fileUri;
            try {
              presignedUrl = await submissionStorageService.getPresignedUrl(
                att.fileUri,
                false,
                att.fileName || "download"
              );
              downloadUrl = await submissionStorageService.getPresignedUrl(
                att.fileUri,
                true,
                att.fileName || "download"
              );
            } catch (err) {
              console.warn("Could not generate presigned URL for submission file:", att.fileUri);
            }
            return {
              attachmentId: att.attachmentId,
              submissionId: att.submissionId,
              fileName: att.fileName,
              fileUrl: presignedUrl,
              downloadUrl: downloadUrl,
              fileSize: att.fileSize != null ? att.fileSize.toString() : null,
              uploadedAt: att.uploadedAt,
            };
          })
        );

        return {
          submissionId: sub.submissionId,
          assignmentId: sub.assignmentId,
          studentId: sub.studentId,
          submittedAt: sub.submittedAt,
          status: sub.status,
          student: sub.Users
            ? {
                userId: sub.Users.userId,
                name: sub.Users.name,
                email: sub.Users.email,
              }
            : null,
          SubmissionAttachments: processedAttachments,
          grade:
            sub.Grades && sub.Grades.length > 0
              ? {
                  gradeId: sub.Grades[0].gradeId,
                  score: sub.Grades[0].score,
                  comment: sub.Grades[0].comment,
                  gradedAt: sub.Grades[0].gradedAt,
                }
              : null,
        };
      })
    );

    return serializedSubmissions;
  }

  /**
   * Chấm điểm cho bài nộp của học sinh (chỉ dành cho giáo viên)
   */
  public async gradeSubmission(
    teacherId: string,
    assignmentId: string,
    submissionId: string,
    payload: { score: number; comment?: string }
  ) {
    // 1. Kiểm tra giáo viên sở hữu bài tập
    const assignment = await this.ensureTeacherOwnsAssignment(teacherId, assignmentId);

    // 2. Tìm bài nộp
    const submission = await prisma.submissions.findUnique({
      where: { submissionId },
    });

    if (!submission) {
      throw new NotFoundError("Không tìm thấy bài nộp.");
    }

    if (submission.assignmentId !== assignmentId) {
      throw new BadRequestError("Bài nộp không thuộc bài tập này.");
    }

    // 3. Thực hiện chấm điểm
    return this.assignmentRepo.upsertGrade({
      submissionId,
      studentId: submission.studentId,
      classId: assignment.classId,
      assignmentId,
      score: payload.score,
      comment: payload.comment,
    });
  }
}

export const assignmentService = new AssignmentService();
