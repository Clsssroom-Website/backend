import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import * as UserRepo from "../repositories/user.repo.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "classroom_secret_key";
const JWT_EXPIRES_IN = "7d";

// ========== ĐĂNG KÝ ==========
export const register = async (data: {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher";
}) => {
  // 1. Kiểm tra email đã tồn tại chưa
  const existing = await UserRepo.findUserByEmail(data.email);
  if (existing) {
    const error = new Error("Email này đã được đăng ký!") as Error & { statusCode: number };
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash mật khẩu
  const passwordHash = await bcrypt.hash(data.password, 10);

  // 3. Tạo user mới
  const userId = uuidv4();
  const newUser = await UserRepo.createUser({
    userId,
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
  });

  // 4. Tạo JWT token
  const token = jwt.sign({ userId: newUser.userId, role: newUser.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      userId: newUser.userId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  };
};

// ========== ĐĂNG NHẬP ==========
export const login = async (data: { email: string; password: string }) => {
  // 1. Tìm user theo email
  const user = await UserRepo.findUserByEmail(data.email);
  if (!user) {
    const error = new Error("Email hoặc mật khẩu không đúng!") as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }

  // 2. So sánh mật khẩu
  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Email hoặc mật khẩu không đúng!") as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }

  // 3. Tạo JWT token
  const token = jwt.sign({ userId: user.userId, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};
