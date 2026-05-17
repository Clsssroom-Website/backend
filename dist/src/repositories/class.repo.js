import prisma from "../config/prisma.js";
// Lấy danh sách lớp học theo teacherId
export const findAllClassesByTeacherId = async (teacherId) => {
    return prisma.classes.findMany({
        where: { teacherId },
        orderBy: { createdAt: "desc" },
    });
};
// Tạo lớp học
export const createClass = async (data) => {
    return prisma.classes.create({ data });
};
// Tìm lớp học qua mã tham gia
export const findClassByJoinCode = async (joinCode) => {
    return prisma.classes.findUnique({ where: { joinCode } });
};
// Tìm lớp học theo ID
export const findClassById = async (classId) => {
    return prisma.classes.findUnique({ where: { classId } });
};
// Cập nhật lớp học
export const updateClass = async (classId, data) => {
    return prisma.classes.update({
        where: { classId },
        data,
    });
};
// Xóa lớp học
export const deleteClass = async (classId) => {
    return prisma.classes.delete({
        where: { classId },
    });
};
// Kiểm tra học sinh đã tham gia lớp chưa
export const checkEnrollmentExists = async (classId, studentId) => {
    return prisma.classEnrollments.findFirst({
        where: { classId, studentId },
    });
};
// Thêm học sinh vào lớp học
export const createEnrollment = async (data) => {
    return prisma.classEnrollments.create({ data });
};
// Lấy danh sách học sinh trong lớp
export const findStudentsByClassId = async (classId) => {
    return prisma.classEnrollments.findMany({
        where: { classId },
        include: {
            Users: {
                select: {
                    userId: true,
                    name: true,
                    email: true,
                    role: true,
                },
            },
        },
        orderBy: { joinTime: "asc" },
    });
};
// Lấy danh sách lớp học mà học sinh đã tham gia
export const findJoinedClassesByStudentId = async (studentId) => {
    return prisma.classEnrollments.findMany({
        where: { studentId },
        include: {
            Classes: {
                include: {
                    _count: {
                        select: { ClassEnrollments: true } // Lấy sĩ số lớp
                    }
                }
            },
        },
        orderBy: { joinTime: "desc" },
    });
};
