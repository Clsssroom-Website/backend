import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../errors/index.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "classroom_secret_key";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Lấy token từ header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token không hợp lệ hoặc bị thiếu.");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Token không được cung cấp.");
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

    // Gắn thông tin payload vào req.user
    req.user = decoded;

    next(); // Tiếp tục chuyển đến controller
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Token đã hết hạn."));
    } else if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError("Token không hợp lệ."));
    }
  }
};
