import prisma from "../config/prisma.js";

// Lấy danh sách lớp học theo teacherId
export const findAllClassesByTeacherId = async (teacherId: string) => {
  return prisma.classes.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });
};

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

// Tìm lớp học theo ID
export const findClassById = async (classId: string) => {
  return prisma.classes.findUnique({ where: { classId } });
};

// Cập nhật lớp học
export const updateClass = async (classId: string, data: any) => {
  return prisma.classes.update({
    where: { classId },
    data,
  });
};

// Xóa lớp học
export const deleteClass = async (classId: string) => {
  return prisma.classes.delete({
    where: { classId },
  });
};
