import { Request, Response, NextFunction } from "express";
import * as ClassService from "../services/class.service.js";
import { UnauthorizedError, ForbiddenError, BadRequestError } from "../errors/index.js";

// GET /api/v1/classes - API lấy danh sách lớp học theo teacherId hoặc studentId
export const getAllClasses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) {
      throw new UnauthorizedError("Vui lòng đăng nhập.");
    }

    let classes;
    if (userPayload.role === "teacher") {
      classes = await ClassService.getAllClassesByTeacherId(userPayload.userId);
    } else if (userPayload.role === "student") {
      classes = await ClassService.getJoinedClassesByStudentId(userPayload.userId);
    } else {
      throw new ForbiddenError("Role không hợp lệ.");
    }

    res.status(200).json({ success: true, message: "Lấy danh sách lớp học thành công!", data: classes });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi lấy danh sách lớp học: " + (error.message || "Internal Server Error"),
    });
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
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi tạo lớp học: " + (error.message || "Internal Server Error"),
    });
  }
};

// GET /api/v1/classes/:id - API lấy chi tiết 1 lớp học
export const getClassById = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || !userPayload.userId) throw new UnauthorizedError("Vui lòng đăng nhập.");
    
    // NOTE: Cần kiểm tra xem user này có trong lớp học hay không, hoặc là teacher. 
    // Tam thời chỉ fetch lớp học.
    const classId = req.params.id as string;
    const classroom = await ClassService.getClassById(classId);

    res.status(200).json({ success: true, message: "Lấy chi tiết lớp học thành công!", data: classroom });
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết lớp học: " + (error.message || "Internal Server Error"),
    });
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
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi cập nhật lớp học: " + (error.message || "Internal Server Error"),
    });
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
  } catch (error: any) {
    console.log(error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi khi xóa lớp học: " + (error.message || "Internal Server Error"),
    });
  }
};
