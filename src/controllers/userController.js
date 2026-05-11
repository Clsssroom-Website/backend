import prisma from "../config/prisma.js";

// Lấy danh sách tất cả users
export const getAllUsers = async (req, res, next) => {
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
    next(err);
  }
};

// Lấy thông tin một user theo ID
export const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: { userId: req.params.id },
      select: {
        userId: true,
        name: true,
        email: true,
        role: true,
      },
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
