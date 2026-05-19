import { v4 as uuidv4 } from "uuid";
import * as StudentRepo from "../repositories/student.repo.js";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";
import { MinioStorageService } from "./storage/minioStorage.js";
const storageService = new MinioStorageService("classroom-assignments");
// Helper kiểm tra học sinh có nằm trong lớp học không
const ensureStudentEnrolled = async (studentId, classId) => {
    const isEnrolled = await ClassRepo.checkEnrollmentExists(classId, studentId);
    if (!isEnrolled) {
        throw new ForbiddenError("Bạn không có quyền truy cập vì chưa tham gia lớp học này.");
    }
};
// Xem chi tiết lớp học dành cho học sinh
export const getClassDetailsForStudent = async (studentId, classId) => {
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
export const getAssignmentsForStudent = async (studentId, classId) => {
    const existingClass = await ClassRepo.findClassById(classId);
    if (!existingClass) {
        throw new NotFoundError("Không tìm thấy lớp học.");
    }
    await ensureStudentEnrolled(studentId, classId);
    const assignments = await StudentRepo.findAssignmentsByClassId(classId);
    // Parse fileUrl to presignedUrl for assignment attachments
    const serializedAssignments = await Promise.all(assignments.map(async (assignment) => {
        let processedAttachments = [];
        if (assignment.AssignmentAttachments && assignment.AssignmentAttachments.length > 0) {
            processedAttachments = await Promise.all(assignment.AssignmentAttachments.map(async (att) => {
                let presignedUrl = att.fileUrl;
                try {
                    presignedUrl = await storageService.getPresignedUrl(att.fileUrl, false, att.fileName || "download");
                }
                catch (err) {
                    console.warn("Could not generate presigned URL for", att.fileUrl);
                }
                return {
                    ...att,
                    fileSize: att.fileSize != null ? att.fileSize.toString() : null,
                    fileUrl: presignedUrl, // Dùng presigned URL
                };
            }));
        }
        return {
            ...assignment,
            AssignmentAttachments: processedAttachments,
        };
    }));
    return serializedAssignments;
};
// Nộp bài tập
export const submitAssignment = async (studentId, assignmentId, files) => {
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
    const newSubmission = await StudentRepo.createSubmission({
        submissionId,
        assignmentId,
        studentId,
        status: "SUBMITTED",
    }, attachments);
    return newSubmission;
};
// Lấy thông tin bài nộp và điểm
export const getSubmissionAndGrade = async (studentId, assignmentId) => {
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
