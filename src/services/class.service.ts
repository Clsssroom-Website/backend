import { v4 as uuidv4 } from "uuid";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError } from "../errors/index.js";

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
