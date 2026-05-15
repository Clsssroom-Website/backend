import { type NextFunction, type Request, type Response } from "express";
import prisma from "../config/prisma.js";
import { NotFoundError } from "../errors/index.js";

// Lấy danh sách tất cả users
export const getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
      },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Lấy danh sách users thất bại!" });
  }
};

// Lấy thông tin một user theo ID
export const getUserById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.id;
    const user = await prisma.users.findUnique({
      where: { userId },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    res.json({ success: true, data: user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Lấy thông tin user thất bại!" });
  }
};
