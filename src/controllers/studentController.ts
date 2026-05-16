import { Request, Response, NextFunction } from "express";
import * as ClassService from "../services/class.service.js";
import * as StudentService from "../services/student.service.js";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/index.js";

const ensureStudentRole = (req: Request) => {
  const userPayload = (req as any).user;
  if (!userPayload || !userPayload.userId) {
    throw new UnauthorizedError("Vui lòng đăng nhập.");
  }
  if (userPayload.role !== "student") {
    throw new ForbiddenError("Chỉ có Học sinh mới được phép thực hiện hành động này.");
  }
  return userPayload.userId;
};

// POST /api/v1/students/classes/join
export const joinClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = ensureStudentRole(req);
    const { joinCode } = req.body;

    if (!joinCode) {
      throw new BadRequestError("Vui lòng cung cấp mã tham gia (joinCode).");
    }

    const targetClass = await ClassService.joinClass(studentId, joinCode);

    res.status(200).json({
      success: true,
      message: "Tham gia lớp học thành công!",
      data: targetClass,
    });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi tham gia lớp học: " + (error.message || "Internal Server Error"),
    });
  }
};

// GET /api/v1/students/classes
export const getEnrolledClasses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = ensureStudentRole(req);
    const classes = await ClassService.getJoinedClassesByStudentId(studentId);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách lớp học tham gia thành công!",
      data: classes,
    });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lớp học tham gia: " + (error.message || "Internal Server Error"),
    });
  }
};

// GET /api/v1/students/classes/:classId
export const getClassDetails = async (req: Request<{ classId: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = ensureStudentRole(req);
    const { classId } = req.params;

    const classDetails = await StudentService.getClassDetailsForStudent(studentId, classId);

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết lớp học thành công!",
      data: classDetails,
    });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết lớp học: " + (error.message || "Internal Server Error"),
    });
  }
};

// GET /api/v1/students/classes/:classId/assignments
export const getAssignments = async (req: Request<{ classId: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = ensureStudentRole(req);
    const { classId } = req.params;

    const assignments = await StudentService.getAssignmentsForStudent(studentId, classId);

    res.status(200).json({
      success: true,
      message: "Lấy danh sách bài tập thành công!",
      data: assignments,
    });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bài tập: " + (error.message || "Internal Server Error"),
    });
  }
};

// POST /api/v1/students/assignments/:assignmentId/submit
export const submitAssignment = async (req: Request<{ assignmentId: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = ensureStudentRole(req);
    const { assignmentId } = req.params;
    const { files } = req.body; // Mảng các file { fileName, fileUri, fileSize }

    // Nếu không có mảng files, giả định học sinh chỉ bấm nộp mà không có file đính kèm (hoặc báo lỗi tuỳ nghiệp vụ)
    const attachments = Array.isArray(files) ? files : [];

    const submission = await StudentService.submitAssignment(studentId, assignmentId, attachments);

    res.status(201).json({
      success: true,
      message: "Nộp bài tập thành công!",
      data: submission,
    });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi nộp bài tập: " + (error.message || "Internal Server Error"),
    });
  }
};

// GET /api/v1/students/assignments/:assignmentId/submission
export const getSubmissionAndGrade = async (req: Request<{ assignmentId: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = ensureStudentRole(req);
    const { assignmentId } = req.params;

    const submission = await StudentService.getSubmissionAndGrade(studentId, assignmentId);

    res.status(200).json({
      success: true,
      message: submission ? "Lấy thông tin bài nộp thành công!" : "Bạn chưa nộp bài tập này.",
      data: submission,
    });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi lấy thông tin bài nộp: " + (error.message || "Internal Server Error"),
    });
  }
};
