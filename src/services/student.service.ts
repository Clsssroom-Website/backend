import { v4 as uuidv4 } from "uuid";
import * as StudentRepo from "../repositories/student.repo.js";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";

// Helper kiểm tra học sinh có nằm trong lớp học không
const ensureStudentEnrolled = async (studentId: string, classId: string) => {
  const isEnrolled = await ClassRepo.checkEnrollmentExists(classId, studentId);
  if (!isEnrolled) {
    throw new ForbiddenError("Bạn không có quyền truy cập vì chưa tham gia lớp học này.");
  }
};

// Xem chi tiết lớp học dành cho học sinh
export const getClassDetailsForStudent = async (studentId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  await ensureStudentEnrolled(studentId, classId);

  // Học sinh không cần xem joinCode/joinLink để bảo mật (tuỳ logic, có thể loại bỏ)
  const { joinCode, joinLink, ...classData } = existingClass;
  return classData;
};

// Lấy danh sách bài tập của 1 lớp học
export const getAssignmentsForStudent = async (studentId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  await ensureStudentEnrolled(studentId, classId);

  return StudentRepo.findAssignmentsByClassId(classId);
};

// Nộp bài tập
export const submitAssignment = async (
  studentId: string,
  assignmentId: string,
  files: { fileName: string; fileUri: string; fileSize: number }[]
) => {
  // 1. Kiểm tra bài tập tồn tại
  const assignment = await StudentRepo.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new NotFoundError("Không tìm thấy bài tập.");
  }

  // 2. Kiểm tra học sinh có trong lớp không
  await ensureStudentEnrolled(studentId, assignment.classId);

  // 3. Kiểm tra hạn nộp (Deadline)
  const now = new Date();
  if (assignment.deadline && now > new Date(assignment.deadline)) {
    throw new BadRequestError("Đã quá hạn nộp bài.");
  }

  // 4. Kiểm tra đã nộp chưa
  const existingSubmission = await StudentRepo.findSubmissionByStudentAndAssignment(studentId, assignmentId);
  if (existingSubmission) {
    throw new BadRequestError("Bạn đã nộp bài tập này rồi. Nếu muốn nộp lại, vui lòng xóa bài cũ (chức năng đang cập nhật).");
  }

  // 5. Tạo Submission
  const submissionId = uuidv4();
  const attachments = files.map((file) => ({
    attachmentId: uuidv4(),
    ...file,
  }));

  const newSubmission = await StudentRepo.createSubmission(
    {
      submissionId,
      assignmentId,
      studentId,
      status: "SUBMITTED",
    },
    attachments
  );

  return newSubmission;
};

// Lấy thông tin bài nộp và điểm
export const getSubmissionAndGrade = async (studentId: string, assignmentId: string) => {
  // 1. Kiểm tra bài tập tồn tại
  const assignment = await StudentRepo.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new NotFoundError("Không tìm thấy bài tập.");
  }

  // 2. Kiểm tra học sinh có trong lớp không
  await ensureStudentEnrolled(studentId, assignment.classId);

  // 3. Lấy Submission
  const submission = await StudentRepo.findSubmissionByStudentAndAssignment(studentId, assignmentId);
  if (!submission) {
    return null; // Chưa nộp bài
  }

  return submission;
};
