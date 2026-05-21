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
        attachmentId: file.attachmentId,
        submissionId: submissionData.submissionId,
        fileName: file.fileName,
        fileUri: file.fileUri,
        fileSize: file.fileSize ? BigInt(file.fileSize) : null,
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

// ─── Student Dashboard Queries ──────────────────────────────────────────────────

export const countEnrolledClasses = async (studentId: string): Promise<number> => {
  return prisma.classEnrollments.count({
    where: { studentId, status: "JOINED" },
  });
};

export const countAssignmentsForStudent = async (studentId: string): Promise<number> => {
  const enrollments = await prisma.classEnrollments.findMany({
    where: { studentId, status: "JOINED" },
    select: { classId: true },
  });
  const classIds = enrollments.map((e) => e.classId);
  if (classIds.length === 0) return 0;
  return prisma.assignments.count({
    where: { classId: { in: classIds }, status: "ACTIVE" },
  });
};

export const countSubmissionsByStudent = async (studentId: string): Promise<number> => {
  return prisma.submissions.count({
    where: { studentId },
  });
};

export const findEnrolledClassSummaries = async (studentId: string, limit = 5) => {
  return prisma.classEnrollments.findMany({
    where: { studentId, status: "JOINED" },
    take: limit,
    orderBy: { joinTime: "desc" },
    select: {
      Classes: {
        select: {
          classId: true,
          className: true,
          status: true,
          createdAt: true,
          Users: {
            select: { name: true },
          },
          _count: {
            select: {
              ClassEnrollments: true,
              Assignments: true,
            },
          },
        },
      },
    },
  });
};

export const findRecentGradesByStudent = async (studentId: string, limit = 10) => {
  return prisma.submissions.findMany({
    where: {
      studentId,
      Grades: { some: {} },
    },
    take: limit,
    orderBy: { submittedAt: "desc" },
    select: {
      submissionId: true,
      submittedAt: true,
      Assignments: {
        select: {
          assignmentId: true,
          title: true,
          Classes: {
            select: { classId: true, className: true },
          },
        },
      },
      Grades: {
        select: {
          score: true,
          comment: true,
          gradedAt: true,
        },
      },
    },
  });
};

export const findUpcomingAssignmentsForStudent = async (studentId: string, limit = 10) => {
  const now = new Date();
  const enrollments = await prisma.classEnrollments.findMany({
    where: { studentId, status: "JOINED" },
    select: { classId: true },
  });
  const classIds = enrollments.map((e) => e.classId);
  if (classIds.length === 0) return [];

  return prisma.assignments.findMany({
    where: {
      classId: { in: classIds },
      status: "ACTIVE",
      deadline: { gte: now },
      Submissions: {
        none: { studentId },
      },
    },
    take: limit,
    orderBy: { deadline: "asc" },
    select: {
      assignmentId: true,
      title: true,
      deadline: true,
      typeAssignment: true,
      Classes: {
        select: { classId: true, className: true },
      },
    },
  });
};

export const findRecentActivitiesByStudent = async (studentId: string, limit = 10) => {
  return prisma.submissions.findMany({
    where: { studentId },
    take: limit,
    orderBy: { submittedAt: "desc" },
    select: {
      submissionId: true,
      submittedAt: true,
      status: true,
      Assignments: {
        select: {
          title: true,
          Classes: { select: { className: true } },
        },
      },
      Grades: {
        select: {
          score: true,
          gradedAt: true,
        },
      },
    },
  });
};

export const findGradesByStudentAndClass = async (studentId: string, classId: string) => {
  return prisma.grades.findMany({
    where: {
      studentId,
      classId,
    },
    orderBy: {
      gradedAt: "desc",
    },
    include: {
      Assignments: {
        select: {
          title: true,
          deadline: true,
        },
      },
    },
  });
};

