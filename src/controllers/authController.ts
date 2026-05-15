import { type Request, type Response, type NextFunction } from "express";
import * as AuthService from "../services/auth.service.js";
import { NotFoundError } from "../errors/index.js";

// POST /api/v1/auth/register
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body as {
      name: string;
      email: string;
      password: string;
      role: "student" | "teacher";
    };

    // Validate input cơ bản
    if (!name || !email || !password || !role) {
      res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin!" });
      return;
    }

    const result = await AuthService.register({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
      data: result,
    });
  } catch (err) {
    console.log("Error in register controller:", err);
    res.status(500).json({ success: false, message: "Đăng ký thất bại. Vui lòng thử lại sau." });
  }
};

// POST /api/v1/auth/login
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Vui lòng nhập email và mật khẩu!" });
      return;
    }

    const result = await AuthService.login({ email, password });

    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công!",
      data: result,
    });
  } catch (err) {
    console.log("Error in login controller:", err);
    res.status(401).json({ success: false, message: "Đăng nhập thất bại. Email hoặc mật khẩu không đúng." });
  }
};
