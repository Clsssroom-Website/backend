import { v4 as uuidv4 } from "uuid";
import * as StudentRepo from "../repositories/student.repo.js";
import * as ClassRepo from "../repositories/class.repo.js";
import { NotFoundError, ForbiddenError, BadRequestError } from "../errors/index.js";
import { MinioStorageService } from "./storage/minioStorage.js";

const storageService = new MinioStorageService("classroom-assignments");
const submissionStorageService = new MinioStorageService("classroom-submissions");

// Helper kiểm tra học sinh có nằm trong lớp học không
const ensureStudentEnrolled = async (studentId: string, classId: string) => {
  const isEnrolled = await ClassRepo.checkEnrollmentExists(classId, studentId);
  if (!isEnrolled) {
    throw new ForbiddenError("Bạn không có quyền truy cập vì chưa tham gia lớp học này.");
  }
};

// Xem chi tiết lớp học dành cho học sinh
export const getClassDetailsForStudent = async (studentId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  await ensureStudentEnrolled(studentId, classId);

  // Học sinh không cần xem joinCode/joinLink để bảo mật (tuỳ logic, có thể loại bỏ)
  const { joinCode, joinLink, ...classData } = existingClass;
  return classData;
};

// Lấy danh sách bài tập của 1 lớp học
export const getAssignmentsForStudent = async (studentId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  await ensureStudentEnrolled(studentId, classId);

  const assignments = await StudentRepo.findAssignmentsByClassId(classId);

  // Parse fileUrl to presignedUrl for assignment attachments
  const serializedAssignments = await Promise.all(
    assignments.map(async (assignment: any) => {
      let processedAttachments = [];
      if (assignment.AssignmentAttachments && assignment.AssignmentAttachments.length > 0) {
        processedAttachments = await Promise.all(
          assignment.AssignmentAttachments.map(async (att: any) => {
            let presignedUrl = att.fileUrl;
            let downloadUrl = att.fileUrl;
            try {
              presignedUrl = await storageService.getPresignedUrl(att.fileUrl, false, att.fileName || "download");
              downloadUrl = await storageService.getPresignedUrl(att.fileUrl, true, att.fileName || "download");
            } catch (err) {
              console.warn("Could not generate presigned URL for", att.fileUrl);
            }
            return {
              ...att,
              fileSize: att.fileSize != null ? att.fileSize.toString() : null,
              fileUrl: presignedUrl, // Dùng presigned URL
              downloadUrl: downloadUrl,
            };
          })
        );
      }
      return {
        ...assignment,
        AssignmentAttachments: processedAttachments,
      };
    })
  );

  return serializedAssignments;
};

// Nộp bài tập
export const submitAssignment = async (
  studentId: string,
  assignmentId: string,
  files: { fileName: string; fileUri: string; fileSize: number }[],
  quizAnswers?: any
) => {
  // 1. Kiểm tra bài tập tồn tại
  const assignment = await StudentRepo.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new NotFoundError("Không tìm thấy bài tập.");
  }

  // 2. Kiểm tra học sinh có trong lớp không
  await ensureStudentEnrolled(studentId, assignment.classId);

  // 3. Kiểm tra hạn nộp (Deadline)
  const now = new Date();
  if (assignment.deadline && now > new Date(assignment.deadline)) {
    throw new BadRequestError("Đã quá hạn nộp bài.");
  }

  // 4. Kiểm tra đã nộp chưa
  const existingSubmission = await StudentRepo.findSubmissionByStudentAndAssignment(studentId, assignmentId);
  if (existingSubmission) {
    throw new BadRequestError("Bạn đã nộp bài tập này rồi. Nếu muốn nộp lại, vui lòng xóa bài cũ (chức năng đang cập nhật).");
  }

  // 5. Tính toán điểm trắc nghiệm tự động (nếu là bài MULTIPLE_CHOICE)
  let dbQuizAnswers: string | null = null;
  let gradeData: {
    gradeId: string;
    score: number;
    comment: string;
    classId: string;
  } | null = null;

  if (assignment.typeAssignment === "MULTIPLE_CHOICE") {
    if (!quizAnswers) {
      throw new BadRequestError("Vui lòng cung cấp đáp án bài kiểm tra.");
    }

    let questions: any[] = [];
    try {
      questions = JSON.parse(assignment.quizData || "[]");
    } catch (err) {
      console.error("Lỗi khi parse quizData:", err);
      throw new BadRequestError("Dữ liệu câu hỏi trắc nghiệm bị lỗi.");
    }

    if (questions.length === 0) {
      throw new BadRequestError("Bài tập trắc nghiệm này chưa có câu hỏi.");
    }

    const studentAnswersArr = Array.isArray(quizAnswers)
      ? quizAnswers
      : typeof quizAnswers === "string"
      ? JSON.parse(quizAnswers)
      : [];

    let correctCount = 0;
    let totalQuestions = questions.length;
    let totalScoreWeight = 0;
    let studentScoreWeight = 0;

    const gradedAnswers = questions.map((q) => {
      const studentAns = studentAnswersArr.find(
        (a: any) => a.questionId === q.id || a.questionId === q.questionId
      );
      const selectedAnswer = studentAns ? studentAns.selectedAnswer : "";
      const isCorrect =
        String(selectedAnswer).trim().toLowerCase() ===
        String(q.correctAnswer).trim().toLowerCase();

      if (isCorrect) {
        correctCount++;
        studentScoreWeight += q.score || 1;
      }
      totalScoreWeight += q.score || 1;

      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    let calculatedScore = 0;
    if (totalScoreWeight > 0) {
      calculatedScore = (studentScoreWeight / totalScoreWeight) * 10;
    } else {
      calculatedScore = (correctCount / totalQuestions) * 10;
    }
    calculatedScore = Math.round(calculatedScore * 100) / 100;

    dbQuizAnswers = JSON.stringify(gradedAnswers);
    gradeData = {
      gradeId: uuidv4(),
      score: calculatedScore,
      comment: `Hệ thống chấm tự động: Đúng ${correctCount}/${totalQuestions} câu.`,
      classId: assignment.classId,
    };
  }

  // 6. Tạo Submission
  const submissionId = uuidv4();
  const attachments = files.map((file) => ({
    attachmentId: uuidv4(),
    ...file,
  }));

  const newSubmission = await StudentRepo.createSubmission(
    {
      submissionId,
      assignmentId,
      studentId,
      status: assignment.typeAssignment === "MULTIPLE_CHOICE" ? "COMPLETED" : "SUBMITTED",
      quizAnswers: dbQuizAnswers,
    },
    attachments,
    gradeData
  );

  if (!newSubmission) {
    throw new BadRequestError("Không thể tạo bài nộp.");
  }

  const attachmentsWithUrls = await Promise.all(
    newSubmission.SubmissionAttachments.map(async (att) => {
      let presignedUrl = att.fileUri;
      let downloadUrl = att.fileUri;
      try {
        presignedUrl = await submissionStorageService.getPresignedUrl(att.fileUri, false, att.fileName || "download");
        downloadUrl = await submissionStorageService.getPresignedUrl(att.fileUri, true, att.fileName || "download");
      } catch (err) {
        console.error("Lỗi khi tạo presigned URL cho bài nộp mới:", err);
      }
      return {
        ...att,
        fileSize: att.fileSize ? att.fileSize.toString() : null,
        fileUrl: presignedUrl,
        downloadUrl: downloadUrl,
      };
    })
  );

  return {
    ...newSubmission,
    SubmissionAttachments: attachmentsWithUrls,
  };
};

// Lấy thông tin bài nộp và điểm
export const getSubmissionAndGrade = async (studentId: string, assignmentId: string) => {
  // 1. Kiểm tra bài tập tồn tại
  const assignment = await StudentRepo.findAssignmentById(assignmentId);
  if (!assignment) {
    throw new NotFoundError("Không tìm thấy bài tập.");
  }

  // 2. Kiểm tra học sinh có trong lớp không
  await ensureStudentEnrolled(studentId, assignment.classId);

  // 3. Lấy Submission
  const submission = await StudentRepo.findSubmissionByStudentAndAssignment(studentId, assignmentId);
  if (!submission) {
    return null; // Chưa nộp bài
  }

  const attachmentsWithUrls = await Promise.all(
    submission.SubmissionAttachments.map(async (att) => {
      let presignedUrl = att.fileUri;
      let downloadUrl = att.fileUri;
      try {
        presignedUrl = await submissionStorageService.getPresignedUrl(att.fileUri, false, att.fileName || "download");
        downloadUrl = await submissionStorageService.getPresignedUrl(att.fileUri, true, att.fileName || "download");
      } catch (err) {
        console.error("Lỗi khi tạo presigned URL cho bài nộp:", err);
      }
      return {
        ...att,
        fileSize: att.fileSize ? att.fileSize.toString() : null,
        fileUrl: presignedUrl,
        downloadUrl: downloadUrl,
      };
    })
  );

  const firstGrade = submission.Grades && submission.Grades.length > 0 ? submission.Grades[0] : null;

  return {
    ...submission,
    SubmissionAttachments: attachmentsWithUrls,
    grade: firstGrade
      ? {
        gradeId: firstGrade.gradeId,
        score: firstGrade.score,
        comment: firstGrade.comment,
        gradedAt: firstGrade.gradedAt,
      }
      : null,
  };
};

// Lấy thông tin Dashboard cho học sinh
export const getStudentDashboard = async (studentId: string) => {
  const [
    totalClasses,
    totalAssignments,
    submittedCount,
    rawClasses,
    rawRecentGrades,
    rawUpcoming,
    rawActivities,
  ] = await Promise.all([
    StudentRepo.countEnrolledClasses(studentId),
    StudentRepo.countAssignmentsForStudent(studentId),
    StudentRepo.countSubmissionsByStudent(studentId),
    StudentRepo.findEnrolledClassSummaries(studentId, 5),
    StudentRepo.findRecentGradesByStudent(studentId, 10),
    StudentRepo.findUpcomingAssignmentsForStudent(studentId, 10),
    StudentRepo.findRecentActivitiesByStudent(studentId, 10),
  ]);

  const stats = {
    totalClasses,
    totalAssignments,
    submittedCount,
    pendingAssignments: Math.max(0, totalAssignments - submittedCount),
  };

  const classes = rawClasses.map((item) => ({
    classId: item.Classes.classId,
    className: item.Classes.className,
    teacherName: item.Classes.Users.name,
    studentCount: item.Classes._count.ClassEnrollments,
    assignmentCount: item.Classes._count.Assignments,
    createdAt: item.Classes.createdAt,
  }));

  const recentGrades = rawRecentGrades.map((g) => ({
    submissionId: g.submissionId,
    assignmentId: g.Assignments.assignmentId,
    assignmentTitle: g.Assignments.title,
    classId: g.Assignments.Classes.classId,
    className: g.Assignments.Classes.className,
    score: g.Grades[0]?.score ?? null,
    comment: g.Grades[0]?.comment ?? null,
    gradedAt: g.Grades[0]?.gradedAt ?? null,
  }));

  const URGENT_THRESHOLD_DAYS = 2;
  const upcomingAssignments = rawUpcoming.map((a) => {
    const diffMs = new Date(a.deadline).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const urgency = diffDays < URGENT_THRESHOLD_DAYS ? "urgent" : "upcoming";

    return {
      assignmentId: a.assignmentId,
      title: a.title,
      classId: a.Classes.classId,
      className: a.Classes.className,
      deadline: a.deadline,
      typeAssignment: a.typeAssignment,
      urgency,
    };
  });

  const recentActivities = rawActivities.map((act) => ({
    submissionId: act.submissionId,
    assignmentTitle: act.Assignments.title,
    className: act.Assignments.Classes.className,
    submittedAt: act.submittedAt,
    status: act.status,
    score: act.Grades[0]?.score ?? null,
    gradedAt: act.Grades[0]?.gradedAt ?? null,
  }));

  return {
    stats,
    classes,
    recentGrades,
    upcomingAssignments,
    recentActivities,
  };
};

// Lấy danh sách điểm số của học sinh trong một lớp
export const getGradesForStudent = async (studentId: string, classId: string) => {
  const existingClass = await ClassRepo.findClassById(classId);
  if (!existingClass) {
    throw new NotFoundError("Không tìm thấy lớp học.");
  }

  await ensureStudentEnrolled(studentId, classId);

  return StudentRepo.findGradesByStudentAndClass(studentId, classId);
};
