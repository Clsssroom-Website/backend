import { v4 as uuidv4 } from "uuid";
import * as ClassRepo from "../repositories/class.repo.js";

// Hàm tạo random joinCode (6 ký tự: chữ + số)
const generateJoinCode = (length = 6): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
  // 1. Tạo joinCode duy nhất
  let joinCode = generateJoinCode();
  let existing = await ClassRepo.findClassByJoinCode(joinCode);
  while (existing) {
    joinCode = generateJoinCode();
    existing = await ClassRepo.findClassByJoinCode(joinCode);
  }

  // 2. Sinh unique classId
  const classId = uuidv4();

  // 3. (Facade pattern) Gộp logic xử lý: có thể bao gồm gửi notify, logs, metrics...
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
