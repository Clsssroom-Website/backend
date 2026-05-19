import * as DashboardRepo from "../repositories/dashboard.repo.js";
// ─── Helper ───────────────────────────────────────────────────────────────────
const URGENT_THRESHOLD_DAYS = 2;
const resolveUrgency = (deadline) => {
    const diffMs = deadline.getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays < URGENT_THRESHOLD_DAYS ? "urgent" : "upcoming";
};
// ─── Service (Facade) ─────────────────────────────────────────────────────────
/**
 * Lấy toàn bộ dữ liệu cho trang Dashboard của giáo viên trong một lần gọi.
 * Pattern: Facade — orchestrates multiple repository calls and maps to DTOs.
 */
export const getTeacherDashboard = async (teacherId) => {
    // Chạy song song để giảm latency
    const [totalClasses, totalStudents, pendingGrades, rawClasses, rawSubmissions, rawUpcoming, rawActivities,] = await Promise.all([
        DashboardRepo.countClassesByTeacherId(teacherId),
        DashboardRepo.countDistinctStudentsByTeacherId(teacherId),
        DashboardRepo.countPendingEssaySubmissionsByTeacherId(teacherId),
        DashboardRepo.findClassSummariesByTeacherId(teacherId, 5),
        DashboardRepo.findPendingEssaySubmissions(teacherId, 10),
        DashboardRepo.findUpcomingAssignmentsByTeacherId(teacherId, 7, 10),
        DashboardRepo.findRecentSubmissionsByTeacherId(teacherId, 10),
    ]);
    const stats = { totalClasses, totalStudents, pendingGrades };
    const classes = rawClasses.map((c) => ({
        classId: c.classId,
        className: c.className,
        joinCode: c.joinCode,
        status: c.status,
        studentCount: c._count.ClassEnrollments,
        assignmentCount: c._count.Assignments,
        createdAt: c.createdAt,
    }));
    const pendingSubmissions = rawSubmissions.map((s) => ({
        submissionId: s.submissionId,
        assignmentId: s.Assignments.assignmentId,
        assignmentTitle: s.Assignments.title,
        assignmentType: s.Assignments.typeAssignment,
        classId: s.Assignments.Classes.classId,
        className: s.Assignments.Classes.className,
        studentId: s.Users.userId,
        studentName: s.Users.name,
        studentEmail: s.Users.email,
        submittedAt: s.submittedAt,
    }));
    const upcomingAssignments = rawUpcoming.map((a) => ({
        assignmentId: a.assignmentId,
        title: a.title,
        classId: a.Classes.classId,
        className: a.Classes.className,
        deadline: a.deadline,
        typeAssignment: a.typeAssignment,
        totalSubmissions: a._count.Submissions,
        urgency: resolveUrgency(a.deadline),
    }));
    const recentActivities = rawActivities.map((s) => ({
        submissionId: s.submissionId,
        studentName: s.Users.name,
        assignmentTitle: s.Assignments.title,
        className: s.Assignments.Classes.className,
        submittedAt: s.submittedAt,
    }));
    return { stats, classes, pendingSubmissions, upcomingAssignments, recentActivities };
};
/**
 * Chỉ lấy stats (tổng hợp số liệu) — dùng khi chỉ cần refresh widgets.
 */
export const getDashboardStats = async (teacherId) => {
    const [totalClasses, totalStudents, pendingGrades] = await Promise.all([
        DashboardRepo.countClassesByTeacherId(teacherId),
        DashboardRepo.countDistinctStudentsByTeacherId(teacherId),
        DashboardRepo.countPendingEssaySubmissionsByTeacherId(teacherId),
    ]);
    return { totalClasses, totalStudents, pendingGrades };
};
