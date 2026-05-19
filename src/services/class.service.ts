import { v4 as uuidv4 } from "uuid";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";
import { MinioStorageService } from "./storage/minioStorage.js";

const storageServiceAssignments = new MinioStorageService("classroom-assignments");
const storageServiceDocuments = new MinioStorageService("classroom-documents");

const generateJoinCode = (length = 6): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Lấy danh sách lớp học theo teacherId
export const getAllClassesByTeacherId = async (teacherId: string, searchQuery?: string) => {
  const classes = await ClassRepo.findAllClassesByTeacherId(teacherId, searchQuery);
  return classes.map((cls: any) => ({
    ...cls,
    totalStudents: cls._count?.ClassEnrollments ?? 0,
    _count: undefined,
  }));
};

export const createClass = async (
  teacherId: string,
  data: {
    className: string;
    description?: string;
    room?: string;
    topic?: string;
  }
) => {
  let joinCode = generateJoinCode();
  let existing = await ClassRepo.findClassByJoinCode(joinCode);
  while (existing) {
    joinCode = generateJoinCode();
    existing = await ClassRepo.findClassByJoinCode(joinCode);
  }

  const classId = uuidv4();
  const newClass = await ClassRepo.createClass({
    classId,
    teacherId,
    className: data.className,
    description: data.description || "",
    room: data.room || "",
    topic: data.topic || "",
    joinCode,
    status: "ACTIVE", // Default status
  });

  return newClass;
};

export const getClassById = async (classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }
  return existingClass;
};

export const updateClass = async (
  teacherId: string,
  classId: string,
  data: {
    className?: string;
    description?: string;
    room?: string;
    topic?: string;
    status?: string;
  }
) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  if (existingClass.teacherId !== teacherId) {
    throw new ForbiddenError("Bạn không phải là chủ sở hữu của lớp học này.");
  }

  return ClassRepo.updateClass(classId, data);
};

export const deleteClass = async (teacherId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  if (existingClass.teacherId !== teacherId) {
    throw new ForbiddenError("Bạn không có quyền xóa lớp học này.");
  }

  return ClassRepo.deleteClass(classId);
};

export const joinClass = async (studentId: string, codeOrLink: string) => {
  // 1. Phân tách lấy joinCode
  let joinCode = codeOrLink.trim();

  // Nếu là link dạng http://localhost:3000/.../abcxyz
  if (joinCode.includes("/")) {
    const parts = joinCode.split("/");
    joinCode = parts[parts.length - 1]; // Lấy phần tử cuối cùng
  }

  // 2. Tìm lớp theo joinCode
  const targetClass = await ClassRepo.findClassByJoinCode(joinCode);
  if (!targetClass) {
    throw new NotFoundError("Không tìm thấy lớp học với mã hoặc link này.");
  }

  // 3. Kiểm tra đã tham gia chưa
  const existingEnrollment = await ClassRepo.checkEnrollmentExists(targetClass.classId, studentId);
  if (existingEnrollment) {
    throw new BadRequestError("Bạn đã tham gia lớp học này rồi.");
  }

  // 4. Tạo Enrollment
  const enrollmentId = uuidv4();
  await ClassRepo.createEnrollment({
    enrollmentId,
    classId: targetClass.classId,
    studentId,
  });

  return targetClass;
};

export const getClassStudents = async (classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  const enrollments = await ClassRepo.findStudentsByClassId(classId);
  // Format lại data cho đẹp: loại bỏ các trường thừa, chỉ lấy thông tin user
  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.enrollmentId,
    joinTime: enrollment.joinTime,
    status: enrollment.status,
    student: enrollment.Users,
  }));
};

export const removeStudentFromClass = async (teacherId: string, classId: string, studentId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  if (existingClass.teacherId !== teacherId) {
    throw new ForbiddenError("Bạn không có quyền thao tác trên lớp học này.");
  }

  const enrollment = await ClassRepo.checkEnrollmentExists(classId, studentId);
  if (!enrollment) {
    throw new NotFoundError("Học sinh này không có trong lớp.");
  }

  await ClassRepo.deleteEnrollment(classId, studentId);
  return { success: true };
};

export const getJoinedClassesByStudentId = async (studentId: string, searchQuery?: string) => {
  const enrollments = await ClassRepo.findJoinedClassesByStudentId(studentId, searchQuery);
  return enrollments.map((enrollment) => {
    const classData = enrollment.Classes as any;
    return {
      ...classData,
      totalStudents: classData._count?.ClassEnrollments || 0,
      joinTime: enrollment.joinTime,
      enrollmentStatus: enrollment.status,
    };
  });
};

export const getClassStream = async (classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  // ─── Lấy kèm fileUrls và biến đổi thành URL ───────────────────
  const assignments = await ClassRepo.findAssignmentsByClassId(classId);
  const documents = await ClassRepo.findDocumentsByClassId(classId);

  // Serialize Assignments
  const processedAssignments = await Promise.all(
    assignments.map(async (a: any) => {
      let attachments = [];
      if (a.AssignmentAttachments?.length > 0) {
        attachments = await Promise.all(
          a.AssignmentAttachments.map(async (att: any) => {
            let presignedUrl = att.fileUrl;
            try {
              presignedUrl = await storageServiceAssignments.getPresignedUrl(att.fileUrl, false, att.fileName || "download");
            } catch (err) {
              console.warn("Could not generate presigned URL for", att.fileUrl);
            }
            return {
              ...att,
              fileSize: att.fileSize != null ? att.fileSize.toString() : null,
              fileUrl: presignedUrl,
            };
          })
        );
      }
      return {
        id: a.assignmentId,
        assignmentId: a.assignmentId,
        type: "assignment",
        title: a.title,
        description: a.description,
        createdAt: a.createdAt,
        deadline: a.deadline,
        status: a.status,
        typeAssignment: a.typeAssignment,
        AssignmentAttachments: attachments,
        totalSubmissions: a._count?.Submissions ?? 0
      };
    })
  );

  // Serialize Documents
  const processedDocuments = await Promise.all(
    documents.map(async (d: any) => {
      let attachments = [];
      if (d.DocumentAttachments?.length > 0) {
        attachments = await Promise.all(
          d.DocumentAttachments.map(async (att: any) => {
            let presignedUrl = att.fileUri;
            try {
              presignedUrl = await storageServiceDocuments.getPresignedUrl(att.fileUri, false, att.fileName || "download");
            } catch (err) {
              console.warn("Could not generate presigned URL for", att.fileUri);
            }
            return {
              ...att,
              fileSize: att.fileSize != null ? att.fileSize.toString() : null,
              fileUrl: presignedUrl, // Normalize to fileUrl like Assignment
            };
          })
        );
      }
      return {
        id: d.documentId,
        documentId: d.documentId,
        type: "document",
        title: d.title,
        description: d.description,
        createdAt: d.uploadTime,
        uploadTime: d.uploadTime,
        DocumentAttachments: attachments
      };
    })
  );

  const stream = [
    ...processedAssignments,
    ...processedDocuments
  ];

  // Sort by timeline descending
  stream.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return stream;
};

