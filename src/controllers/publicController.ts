import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";
import { BadRequestError } from "../errors/index.js";

// Trích xuất Form ID từ Google Forms URL để đối chiếu chính xác
export const extractFormId = (url: string): string | null => {
  if (!url) return null;
  // Khớp định dạng: /forms/d/e/ID/viewform hoặc /forms/d/ID/edit
  const match = url.match(/\/forms\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// POST /api/v1/public/quiz-grade - Webhook đồng bộ điểm từ Google Forms
export const receiveQuizGrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, quizUrl, score, secret } = req.body;

    // Xác thực bằng secret key cấu hình trong .env
    const expectedSecret = process.env.QUIZ_WEBHOOK_SECRET || "quiz_webhook_secret_key";
    if (secret !== expectedSecret) {
      res.status(401).json({
        success: false,
        message: "Không có quyền truy cập: Secret key không chính xác.",
      });
      return;
    }

    if (!email || !quizUrl || score === undefined) {
      throw new BadRequestError("Vui lòng cung cấp email, quizUrl và score.");
    }

    // 1. Tìm học sinh theo email
    const student = await prisma.users.findFirst({
      where: {
        email: email,
        role: "student",
      },
    });

    if (!student) {
      res.status(404).json({
        success: false,
        message: `Học sinh với email ${email} không tồn tại trên hệ thống.`,
      });
      return;
    }

    // 2. Tìm bài tập tương ứng bằng cách đối chiếu Form ID
    const incomingFormId = extractFormId(quizUrl);
    if (!incomingFormId) {
      throw new BadRequestError("Không thể trích xuất Form ID từ URL được cung cấp.");
    }

    const assignments = await prisma.assignments.findMany({
      where: {
        typeAssignment: "MULTIPLE_CHOICE",
        quizUrl: { not: null },
      },
    });

    const matchingAssignment = assignments.find((a) => {
      const formId = extractFormId(a.quizUrl!);
      return formId === incomingFormId;
    });

    if (!matchingAssignment) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy bài tập trắc nghiệm tương ứng trên hệ thống.",
      });
      return;
    }

    const assignmentId = matchingAssignment.assignmentId;
    const studentId = student.userId;
    const classId = matchingAssignment.classId;

    // 3. Kiểm tra xem học sinh đã gia nhập lớp học chưa
    const enrollment = await prisma.classEnrollments.findFirst({
      where: {
        classId,
        studentId,
        status: "JOINED",
      },
    });

    if (!enrollment) {
      res.status(400).json({
        success: false,
        message: "Học sinh chưa tham gia lớp học của bài tập này.",
      });
      return;
    }

    // 4. Tạo hoặc cập nhật bài nộp và điểm số trong Transaction
    await prisma.$transaction(async (tx) => {
      // Tìm bài nộp hiện tại
      let existingSub = await tx.submissions.findFirst({
        where: {
          studentId,
          assignmentId,
        },
      });

      if (!existingSub) {
        // Tạo bài nộp mới
        const submissionId = uuidv4();
        existingSub = await tx.submissions.create({
          data: {
            submissionId,
            assignmentId,
            studentId,
            status: "COMPLETED",
          },
        });
      } else {
        // Cập nhật trạng thái bài nộp nếu chưa hoàn thành
        if (existingSub.status !== "COMPLETED") {
          existingSub = await tx.submissions.update({
            where: { submissionId: existingSub.submissionId },
            data: { status: "COMPLETED" },
          });
        }
      }

      // Lưu điểm số
      const existingGrade = await tx.grades.findFirst({
        where: { submissionId: existingSub.submissionId },
      });

      if (existingGrade) {
        await tx.grades.update({
          where: { gradeId: existingGrade.gradeId },
          data: {
            score: Number(score),
            comment: "Đồng bộ điểm tự động từ Google Forms",
            gradedAt: new Date(),
          },
        });
      } else {
        await tx.grades.create({
          data: {
            gradeId: uuidv4(),
            submissionId: existingSub.submissionId,
            studentId,
            classId,
            assignmentId,
            score: Number(score),
            comment: "Đồng bộ điểm tự động từ Google Forms",
            gradedAt: new Date(),
          },
        });
      }
    });

    res.status(200).json({
      success: true,
      message: "Đồng bộ điểm thành công!",
      data: {
        studentName: student.name,
        assignmentTitle: matchingAssignment.title,
        score: score,
      },
    });
  } catch (error: any) {
    console.error("Lỗi khi đồng bộ điểm từ Google Forms:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "Lỗi đồng bộ điểm: " + (error.message || "Internal Server Error"),
    });
  }
};
