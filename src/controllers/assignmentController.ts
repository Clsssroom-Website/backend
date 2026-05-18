import { Request, Response, NextFunction } from "express";
import * as AssignmentService from "../services/assignment.service.js";
import { UnauthorizedError, ForbiddenError } from "../errors/index.js";

const ensureTeacher = (req: Request): string => {
  const userPayload = (req as any).user;
  if (!userPayload || !userPayload.userId) throw new UnauthorizedError("Vui lòng đăng nhập.");
  if (userPayload.role !== "teacher") throw new ForbiddenError("Chỉ Giáo viên mới được thực hiện hành động này.");
  return userPayload.userId as string;
};

// GET /api/v1/classes/:id/assignments — Teacher lấy danh sách bài tập
export const getAssignments = async (
  req: Request<{ id: string }>,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const teacherId = ensureTeacher(req);
    const assignments = await AssignmentService.getAssignmentsByClassId(teacherId, req.params.id);
    res.status(200).json({ success: true, message: "Lấy danh sách bài tập thành công!", data: assignments });
  } catch (error: any) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// POST /api/v1/classes/:id/assignments — Teacher tạo bài tập
export const createAssignment = async (
  req: Request<{ id: string }>,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const teacherId = ensureTeacher(req);
    const { title, description, deadline, typeAssignment, attachments } = req.body;

    const assignment = await AssignmentService.createAssignment(teacherId, req.params.id, {
      title,
      description,
      deadline,
      typeAssignment,
      attachments,
    });
    res.status(201).json({ success: true, message: "Tạo bài tập thành công!", data: assignment });
  } catch (error: any) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// PUT /api/v1/classes/:id/assignments/:assignmentId — Teacher chỉnh sửa bài tập
export const updateAssignment = async (
  req: Request<{ id: string; assignmentId: string }>,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const teacherId = ensureTeacher(req);
    const { title, description, deadline, typeAssignment, attachments } = req.body;

    const updated = await AssignmentService.updateAssignment(teacherId, req.params.assignmentId, {
      title,
      description,
      deadline,
      typeAssignment,
      attachments,
    });
    res.status(200).json({ success: true, message: "Cập nhật bài tập thành công!", data: updated });
  } catch (error: any) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// DELETE /api/v1/classes/:id/assignments/:assignmentId — Teacher xóa bài tập
export const deleteAssignment = async (
  req: Request<{ id: string; assignmentId: string }>,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const teacherId = ensureTeacher(req);
    await AssignmentService.deleteAssignment(teacherId, req.params.assignmentId);
    res.status(200).json({ success: true, message: "Xóa bài tập thành công!" });
  } catch (error: any) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

// DELETE /api/v1/classes/:id/assignments/:assignmentId/attachments/:attachmentId — Xóa 1 file đính kèm
export const deleteAttachment = async (
  req: Request<{ id: string; assignmentId: string; attachmentId: string }>,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const teacherId = ensureTeacher(req);
    await AssignmentService.deleteAttachment(teacherId, req.params.assignmentId, req.params.attachmentId);
    res.status(200).json({ success: true, message: "Xóa file đính kèm thành công!" });
  } catch (error: any) {
    console.error(error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};
