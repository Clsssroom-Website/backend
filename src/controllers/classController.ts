import { Request, Response, NextFunction } from "express";
import * as ClassService from "../services/class.service.js";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/index.js";

// GET /api/v1/classes - API lấy danh sách lớp học theo teacherId
export const getAllClasses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedError("Vui lòng đăng nhập.");
    }
    if (userPayload.role !== "teacher") {
      throw new ForbiddenError("Chỉ có Giáo viên mới được phép xem danh sách này.");
    }

    const teacherId = userPayload.userId;
    const classes = await ClassService.getAllClassesByTeacherId(teacherId);

    res.status(200).json({ success: true, message: "Lấy danh sách lớp học thành công!", data: classes });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/classes - API tạo lớp học
export const createClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedError("Vui lòng đăng nhập.");
    }
    if (userPayload.role !== "teacher") {
      throw new ForbiddenError("Chỉ có Giáo viên mới được phép tạo lớp học.");
    }

    const teacherId = userPayload.userId;
    const { className, description, room, topic } = req.body;
    if (!className) {
      throw new BadRequestError("className is required");
    }

    const newClass = await ClassService.createClass(teacherId, {
      className,
      description,
      room,
      topic,
    });

    res.status(201).json({ message: "Tạo lớp học thành công!", data: newClass });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/classes/:id - API cập nhật lớp học
export const updateClass = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) throw new UnauthorizedError("Vui lòng đăng nhập.");
    if (userPayload.role !== "teacher") throw new ForbiddenError("Chỉ có Giáo viên mới được phép thao tác.");

    const teacherId = userPayload.userId;
    const classId = req.params.id as string;
    const updateData = req.body;

    const updatedClass = await ClassService.updateClass(teacherId, classId, updateData);

    res.status(200).json({ message: "Cập nhật lớp học thành công!", data: updatedClass });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/classes/:id - API xóa lớp học
export const deleteClass = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) throw new UnauthorizedError("Vui lòng đăng nhập.");
    if (userPayload.role !== "teacher") throw new ForbiddenError("Chỉ có Giáo viên mới được phép thao tác.");

    const teacherId = userPayload.userId;
    const classId = req.params.id as string;

    await ClassService.deleteClass(teacherId, classId);

    res.status(200).json({ message: "Xóa lớp học thành công!" });
  } catch (error) {
    next(error);
  }
};
