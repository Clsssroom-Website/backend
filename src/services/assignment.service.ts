import * as AssignmentRepo from "../repositories/assignment.repo.js";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";

// Helper: kiểm tra teacher có quyền trên bài tập không
const ensureTeacherOwnsAssignment = async (teacherId: string, assignmentId: string) => {
  const assignment = await AssignmentRepo.findAssignmentById(assignmentId);
  if (!assignment) throw new NotFoundError("Không tìm thấy bài tập.");
  const cls = assignment.Classes as any;
  if (cls?.teacherId !== teacherId) throw new ForbiddenError("Bạn không có quyền thao tác với bài tập này.");
  return assignment;
};

// Tạo bài tập mới — chỉ teacher sở hữu lớp mới được tạo
export const createAssignment = async (
  teacherId: string,
  classId: string,
  data: {
    title: string;
    description?: string;
    deadline: string; // ISO string từ frontend
    typeAssignment?: string;
    attachments?: { fileName: string; fileUrl: string }[];
  }
) => {
  // 1. Kiểm tra lớp tồn tại
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) throw new NotFoundError("Không tìm thấy lớp học.");

  // 2. Kiểm tra teacher có phải chủ lớp không
  if (existingClass.teacherId !== teacherId) {
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
  const assignment = await AssignmentRepo.createAssignment({
    classId,
    title: data.title.trim(),
    description: data.description?.trim(),
    deadline: deadlineDate,
    typeAssignment: data.typeAssignment ?? "ESSAY",
  });

  // 6. Thêm file đính kèm nếu có
  if (data.attachments && data.attachments.length > 0) {
    await AssignmentRepo.createAttachments(assignment.assignmentId, data.attachments);
  }

  // Fetch lại để trả về đầy đủ dữ liệu kèm attachments
  return AssignmentRepo.findAssignmentById(assignment.assignmentId);
};

// Lấy danh sách bài tập của lớp — chỉ teacher sở hữu lớp
export const getAssignmentsByClassId = async (teacherId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) throw new NotFoundError("Không tìm thấy lớp học.");
  if (existingClass.teacherId !== teacherId) {
    throw new ForbiddenError("Bạn không có quyền xem bài tập của lớp học này.");
  }

  const assignments = await AssignmentRepo.findAssignmentsByClassId(classId);
  return assignments.map((a: any) => ({
    ...a,
    totalSubmissions: a._count?.Submissions ?? 0,
    _count: undefined,
  }));
};

// Cập nhật bài tập — chỉ teacher sở hữu lớp
export const updateAssignment = async (
  teacherId: string,
  assignmentId: string,
  data: {
    title?: string;
    description?: string;
    deadline?: string;
    typeAssignment?: string;
    attachments?: { fileName: string; fileUrl: string }[];
  }
) => {
  await ensureTeacherOwnsAssignment(teacherId, assignmentId);

  // Validate
  if (data.title !== undefined && data.title.trim() === "") {
    throw new BadRequestError("Tiêu đề không được để trống.");
  }

  let deadlineDate: Date | undefined;
  if (data.deadline) {
    deadlineDate = new Date(data.deadline);
    if (isNaN(deadlineDate.getTime())) throw new BadRequestError("Hạn nộp không hợp lệ.");
  }

  // Cập nhật thông tin bài tập
  await AssignmentRepo.updateAssignment(assignmentId, {
    title: data.title?.trim(),
    description: data.description?.trim(),
    deadline: deadlineDate,
    typeAssignment: data.typeAssignment,
  });

  // Nếu có attachments mới → xóa cũ, thêm mới
  if (data.attachments !== undefined) {
    await AssignmentRepo.deleteAllAttachments(assignmentId);
    if (data.attachments.length > 0) {
      await AssignmentRepo.createAttachments(assignmentId, data.attachments);
    }
  }

  // Trả về bài tập đã cập nhật đầy đủ
  return AssignmentRepo.findAssignmentById(assignmentId);
};

// Xóa file đính kèm đơn lẻ
export const deleteAttachment = async (teacherId: string, assignmentId: string, attachmentId: string) => {
  await ensureTeacherOwnsAssignment(teacherId, assignmentId);
  return AssignmentRepo.deleteAttachment(attachmentId);
};

// Xóa bài tập — chỉ teacher sở hữu lớp
export const deleteAssignment = async (teacherId: string, assignmentId: string) => {
  await ensureTeacherOwnsAssignment(teacherId, assignmentId);
  // Xóa attachments trước (tránh FK constraint)
  await AssignmentRepo.deleteAllAttachments(assignmentId);
  return AssignmentRepo.deleteAssignment(assignmentId);
};
