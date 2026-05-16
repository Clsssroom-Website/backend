import prisma from "../config/prisma.js";

// Lấy danh sách bài tập của 1 lớp học
export const findAssignmentsByClassId = async (classId: string) => {
  return prisma.assignments.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
    include: {
      AssignmentAttachments: true,
    },
  });
};

// Lấy chi tiết bài tập
export const findAssignmentById = async (assignmentId: string) => {
  return prisma.assignments.findUnique({
    where: { assignmentId },
    include: {
      AssignmentAttachments: true,
      Classes: {
        select: {
          classId: true,
          className: true,
          teacherId: true,
        },
      },
    },
  });
};

// Tìm bài nộp của 1 học sinh cho 1 bài tập
export const findSubmissionByStudentAndAssignment = async (studentId: string, assignmentId: string) => {
  return prisma.submissions.findFirst({
    where: {
      studentId,
      assignmentId,
    },
    include: {
      SubmissionAttachments: true,
      Grades: true,
    },
  });
};

// Lấy chi tiết 1 bài nộp (dùng khi cần thiết)
export const findSubmissionById = async (submissionId: string) => {
  return prisma.submissions.findUnique({
    where: { submissionId },
    include: {
      SubmissionAttachments: true,
      Grades: true,
    },
  });
};

// Tạo bài nộp
export const createSubmission = async (
  submissionData: {
    submissionId: string;
    assignmentId: string;
    studentId: string;
    status: string;
  },
  attachments: {
    attachmentId: string;
    fileName: string;
    fileUri: string;
    fileSize: number;
  }[]
) => {
  return prisma.$transaction(async (tx) => {
    // Lưu thông tin submission
    const submission = await tx.submissions.create({
      data: submissionData,
    });

    // Lưu file đính kèm (nếu có)
    if (attachments && attachments.length > 0) {
      const attachmentsData = attachments.map((file) => ({
        ...file,
        submissionId: submissionData.submissionId,
      }));
      await tx.submissionAttachments.createMany({
        data: attachmentsData,
      });
    }

    // Trả về submission bao gồm các file đính kèm
    return tx.submissions.findUnique({
      where: { submissionId: submission.submissionId },
      include: { SubmissionAttachments: true },
    });
  });
};
