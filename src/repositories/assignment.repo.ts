import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";

// Tạo bài tập mới (Teacher)
export const createAssignment = async (data: {
  classId: string;
  title: string;
  description?: string;
  deadline: Date;
  typeAssignment?: string;
}) => {
  const assignmentId = uuidv4();
  return prisma.assignments.create({
    data: {
      assignmentId,
      classId: data.classId,
      title: data.title,
      description: data.description ?? "",
      deadline: data.deadline,
      typeAssignment: data.typeAssignment ?? "ESSAY",
      status: "ACTIVE",
    },
    include: {
      AssignmentAttachments: true,
    },
  });
};

// Lấy danh sách bài tập của 1 lớp (Teacher)
export const findAssignmentsByClassId = async (classId: string) => {
  return prisma.assignments.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
    include: {
      AssignmentAttachments: true,
      _count: {
        select: { Submissions: true },
      },
    },
  });
};

// Lấy chi tiết 1 bài tập
export const findAssignmentById = async (assignmentId: string) => {
  return prisma.assignments.findUnique({
    where: { assignmentId },
    include: {
      AssignmentAttachments: true,
      Classes: {
        select: { classId: true, className: true, teacherId: true },
      },
    },
  });
};

// Cập nhật bài tập
export const updateAssignment = async (
  assignmentId: string,
  data: {
    title?: string;
    description?: string;
    deadline?: Date;
    typeAssignment?: string;
    status?: string;
  }
) => {
  return prisma.assignments.update({
    where: { assignmentId },
    data,
    include: { AssignmentAttachments: true },
  });
};

// Xóa bài tập
export const deleteAssignment = async (assignmentId: string) => {
  return prisma.assignments.delete({ where: { assignmentId } });
};

// Thêm file đính kèm vào bài tập
export const createAttachments = async (
  assignmentId: string,
  attachments: { fileName: string; fileUrl: string; fileSize?: number }[]
) => {
  const data = attachments.map((a) => ({
    attachmentId: uuidv4(),
    assignmentId,
    fileName: a.fileName,
    fileUrl: a.fileUrl,
    fileSize: a.fileSize ? BigInt(a.fileSize) : null,
  }));
  return prisma.assignmentAttachments.createMany({ data });
};

// Xóa 1 file đính kèm
export const deleteAttachment = async (attachmentId: string) => {
  return prisma.assignmentAttachments.delete({ where: { attachmentId } });
};

// Xóa tất cả file đính kèm của 1 bài tập
export const deleteAllAttachments = async (assignmentId: string) => {
  return prisma.assignmentAttachments.deleteMany({ where: { assignmentId } });
};
