import { Request, Response, NextFunction } from "express";
import * as ClassService from "../services/class.service.js";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/index.js";

// POST /api/v1/classes - API tạo lớp học
export const createClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Lấy thông tin user từ Middleware (sau khi parse JWT token)
    const userPayload = (req as any).user;
    
    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedError("Vui lòng đăng nhập.");
    }

    // Kiểm tra trực tiếp role của user thực hiện API
    if (userPayload.role !== "teacher") {
      throw new ForbiddenError("Chỉ có Giáo viên mới được phép tạo lớp học.");
    }

    // KHÔNG lấy qua req.body.teacherId để tránh mạo danh
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
