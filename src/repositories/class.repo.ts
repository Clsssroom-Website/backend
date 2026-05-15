import prisma from "../config/prisma.js";

// Tạo lớp học
export const createClass = async (data: {
  classId: string;
  teacherId: string;
  className: string;
  description?: string;
  room?: string;
  topic?: string;
  joinCode: string;
  joinLink?: string;
  status?: string;
}) => {
  return prisma.classes.create({ data });
};

// Tìm lớp học qua mã tham gia
export const findClassByJoinCode = async (joinCode: string) => {
  return prisma.classes.findUnique({ where: { joinCode } });
};
