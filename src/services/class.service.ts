import { v4 as uuidv4 } from "uuid";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";

const generateJoinCode = (length = 6): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Lấy danh sách lớp học theo teacherId
export const getAllClassesByTeacherId = async (teacherId: string) => {
  return ClassRepo.findAllClassesByTeacherId(teacherId);
};

export const createClass = async (
  teacherId: string,
  data: {
    className: string;
    description?: string;
    room?: string;
    topic?: string;
  }
) => {
  let joinCode = generateJoinCode();
  let existing = await ClassRepo.findClassByJoinCode(joinCode);
  while (existing) {
    joinCode = generateJoinCode();
    existing = await ClassRepo.findClassByJoinCode(joinCode);
  }

  const classId = uuidv4();
  const newClass = await ClassRepo.createClass({
    classId,
    teacherId,
    className: data.className,
    description: data.description || "",
    room: data.room || "",
    topic: data.topic || "",
    joinCode,
    status: "ACTIVE", // Default status
  });

  return newClass;
};

export const getClassById = async (classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }
  return existingClass;
};

export const updateClass = async (
  teacherId: string,
  classId: string,
  data: {
    className?: string;
    description?: string;
    room?: string;
    topic?: string;
    status?: string;
  }
) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  if (existingClass.teacherId !== teacherId) {
    throw new ForbiddenError("Bạn không phải là chủ sở hữu của lớp học này.");
  }

  return ClassRepo.updateClass(classId, data);
};

export const deleteClass = async (teacherId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  if (existingClass.teacherId !== teacherId) {
    throw new ForbiddenError("Bạn không có quyền xóa lớp học này.");
  }

  return ClassRepo.deleteClass(classId);
};

export const joinClass = async (studentId: string, codeOrLink: string) => {
  // 1. Phân tách lấy joinCode
  let joinCode = codeOrLink.trim();

  // Nếu là link dạng http://localhost:3000/.../abcxyz
  if (joinCode.includes("/")) {
    const parts = joinCode.split("/");
    joinCode = parts[parts.length - 1]; // Lấy phần tử cuối cùng
  }

  // 2. Tìm lớp theo joinCode
  const targetClass = await ClassRepo.findClassByJoinCode(joinCode);
  if (!targetClass) {
    throw new NotFoundError("Không tìm thấy lớp học với mã hoặc link này.");
  }

  // 3. Kiểm tra đã tham gia chưa
  const existingEnrollment = await ClassRepo.checkEnrollmentExists(targetClass.classId, studentId);
  if (existingEnrollment) {
    throw new BadRequestError("Bạn đã tham gia lớp học này rồi.");
  }

  // 4. Tạo Enrollment
  const enrollmentId = uuidv4();
  await ClassRepo.createEnrollment({
    enrollmentId,
    classId: targetClass.classId,
    studentId,
  });

  return targetClass;
};

export const getClassStudents = async (classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  const enrollments = await ClassRepo.findStudentsByClassId(classId);
  // Format lại data cho đẹp: loại bỏ các trường thừa, chỉ lấy thông tin user
  return enrollments.map((enrollment) => ({
    enrollmentId: enrollment.enrollmentId,
    joinTime: enrollment.joinTime,
    status: enrollment.status,
    student: enrollment.Users,
  }));
};

export const getJoinedClassesByStudentId = async (studentId: string) => {
  const enrollments = await ClassRepo.findJoinedClassesByStudentId(studentId);
  return enrollments.map((enrollment) => {
    const classData = enrollment.Classes as any;
    return {
      ...classData,
      totalStudents: classData._count?.ClassEnrollments || 0,
      joinTime: enrollment.joinTime,
      enrollmentStatus: enrollment.status,
    };
  });
};
