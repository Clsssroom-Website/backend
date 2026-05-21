import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ClassService from "../class.service.js";
import * as ClassRepo from "../../repositories/class.repo.js";
import { NotFoundError, ForbiddenError } from "../../errors/index.js";

// Mock the class repository
vi.mock("../../repositories/class.repo.js");

// ─── Shared helpers ───────────────────────────────────────────────────────────

const mockClass = {
  classId: "class-1",
  teacherId: "teacher-1",
  className: "Math 101",
  description: "Intro to Math",
  room: "Room 101",
  topic: "Math",
  joinCode: "MATH10",
  joinLink: null,
  status: "ACTIVE",
  createdAt: new Date(),
};

const pastDeadline = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 ngày trước
const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày sau

const mockAssignments = [
  {
    assignmentId: "assign-1",
    title: "Homework 1",
    deadline: pastDeadline, // Đã quá hạn
    typeAssignment: "homework",
  },
  {
    assignmentId: "assign-2",
    title: "Homework 2",
    deadline: pastDeadline, // Đã quá hạn
    typeAssignment: "homework",
  },
  {
    assignmentId: "assign-3",
    title: "Final Exam",
    deadline: futureDeadline, // Chưa tới hạn
    typeAssignment: "exam",
  },
];

const mockEnrollments = [
  {
    enrollmentId: "enroll-1",
    classId: "class-1",
    studentId: "student-1",
    joinTime: new Date(),
    status: "JOINED",
    Users: { userId: "student-1", name: "Alice Student", email: "alice@student.com" },
  },
  {
    enrollmentId: "enroll-2",
    classId: "class-1",
    studentId: "student-2",
    joinTime: new Date(),
    status: "JOINED",
    Users: { userId: "student-2", name: "Bob Student", email: "bob@student.com" },
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ClassService - getClassGrades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw NotFoundError if class does not exist", async () => {
    vi.mocked(ClassRepo.findClassById).mockResolvedValue(null);

    await expect(ClassService.getClassGrades("teacher-1", "non-existent-class"))
      .rejects.toThrow(NotFoundError);
  });

  it("should throw ForbiddenError if request is not made by the class teacher", async () => {
    vi.mocked(ClassRepo.findClassById).mockResolvedValue(mockClass);

    await expect(ClassService.getClassGrades("teacher-2", "class-1"))
      .rejects.toThrow(ForbiddenError);
  });

  it("should calculate student grades and average score correctly (with submissions)", async () => {
    const mockGrades = [
      // Alice: có điểm assign-1 và assign-2
      {
        gradeId: "grade-1",
        studentId: "student-1",
        assignmentId: "assign-1",
        score: 8.5,
        comment: "Well done",
        gradedAt: new Date(),
      },
      {
        gradeId: "grade-2",
        studentId: "student-1",
        assignmentId: "assign-2",
        score: 9.5,
        comment: "Excellent",
        gradedAt: new Date(),
      },
      // Bob: chỉ có điểm assign-1
      {
        gradeId: "grade-3",
        studentId: "student-2",
        assignmentId: "assign-1",
        score: 7.0,
        comment: "Satisfactory",
        gradedAt: new Date(),
      },
    ];

    // Bob đã nộp assign-2 nhưng chưa được chấm (pending)
    const mockSubmissions = [
      { submissionId: "sub-1", studentId: "student-2", assignmentId: "assign-2" },
    ];

    vi.mocked(ClassRepo.findClassById).mockResolvedValue(mockClass);
    vi.mocked(ClassRepo.findClassGradebookData).mockResolvedValue({
      assignments: mockAssignments,
      enrollments: mockEnrollments,
      grades: mockGrades,
      submissions: mockSubmissions,
    });

    const result = await ClassService.getClassGrades("teacher-1", "class-1");

    expect(result.assignments).toEqual(mockAssignments);
    expect(result.students).toHaveLength(2);

    // ── Alice ──
    const alice = result.students.find((s) => s.studentId === "student-1")!;
    expect(alice.name).toBe("Alice Student");
    // assign-1: graded
    expect(alice.grades[0]).toMatchObject({ score: 8.5, status: "graded" });
    // assign-2: graded
    expect(alice.grades[1]).toMatchObject({ score: 9.5, status: "graded" });
    // assign-3: chưa tới hạn, Alice chưa nộp → not_started
    expect(alice.grades[2]).toMatchObject({ score: null, status: "not_started" });
    // Average: (8.5 + 9.5) / 2 = 9.0
    expect(alice.averageScore).toBe(9.0);

    // ── Bob ──
    const bob = result.students.find((s) => s.studentId === "student-2")!;
    expect(bob.name).toBe("Bob Student");
    // assign-1: graded
    expect(bob.grades[0]).toMatchObject({ score: 7.0, status: "graded" });
    // assign-2: đã nộp nhưng giáo viên chưa chấm → pending (không phải absent)
    expect(bob.grades[1]).toMatchObject({ score: null, status: "pending" });
    // assign-3: chưa tới hạn → not_started
    expect(bob.grades[2]).toMatchObject({ score: null, status: "not_started" });
    // Average: chỉ tính điểm 7.0 (pending và not_started bị bỏ qua)
    expect(bob.averageScore).toBe(7.0);
  });

  it("should auto-assign score=0 when deadline passed and student has NO submission and NO grade", async () => {
    const mockGrades: any[] = []; // Không có điểm nào
    const mockSubmissions: any[] = []; // Không có bài nộp nào

    vi.mocked(ClassRepo.findClassById).mockResolvedValue(mockClass);
    vi.mocked(ClassRepo.findClassGradebookData).mockResolvedValue({
      assignments: mockAssignments,
      enrollments: [mockEnrollments[0]], // Chỉ test Alice
      grades: mockGrades,
      submissions: mockSubmissions,
    });

    const result = await ClassService.getClassGrades("teacher-1", "class-1");
    const alice = result.students[0];

    // assign-1: đã quá hạn, không nộp, không có điểm → absent, score = 0
    expect(alice.grades[0]).toMatchObject({
      score: 0,
      comment: "Không nộp bài",
      status: "absent",
    });
    // assign-2: đã quá hạn, không nộp, không có điểm → absent, score = 0
    expect(alice.grades[1]).toMatchObject({
      score: 0,
      comment: "Không nộp bài",
      status: "absent",
    });
    // assign-3: chưa tới hạn → not_started, score = null
    expect(alice.grades[2]).toMatchObject({
      score: null,
      status: "not_started",
    });

    // Average: (0 + 0) / 2 = 0.0 (bao gồm cả điểm absent)
    expect(alice.averageScore).toBe(0.0);
  });

  it("should NOT auto-assign 0 if student submitted but teacher has not graded yet", async () => {
    const mockGrades: any[] = [];
    // Alice đã nộp assign-1 (đã quá hạn) nhưng giáo viên chưa chấm
    const mockSubmissions = [
      { submissionId: "sub-1", studentId: "student-1", assignmentId: "assign-1" },
    ];

    vi.mocked(ClassRepo.findClassById).mockResolvedValue(mockClass);
    vi.mocked(ClassRepo.findClassGradebookData).mockResolvedValue({
      assignments: mockAssignments,
      enrollments: [mockEnrollments[0]],
      grades: mockGrades,
      submissions: mockSubmissions,
    });

    const result = await ClassService.getClassGrades("teacher-1", "class-1");
    const alice = result.students[0];

    // assign-1: đã nộp nhưng chưa chấm → pending, KHÔNG phải 0
    expect(alice.grades[0]).toMatchObject({
      score: null,
      status: "pending",
    });
    // assign-2: quá hạn, không nộp → absent, score = 0
    expect(alice.grades[1]).toMatchObject({
      score: 0,
      status: "absent",
    });
    // Average: chỉ 0 của assign-2 được tính (pending bỏ qua)
    expect(alice.averageScore).toBe(0.0);
  });

  it("should return null for averageScore if student has no graded or absent assignments", async () => {
    const singleFutureAssignment = [
      {
        assignmentId: "assign-future",
        title: "Future HW",
        deadline: futureDeadline,
        typeAssignment: "homework",
      },
    ];

    vi.mocked(ClassRepo.findClassById).mockResolvedValue(mockClass);
    vi.mocked(ClassRepo.findClassGradebookData).mockResolvedValue({
      assignments: singleFutureAssignment,
      enrollments: [mockEnrollments[0]],
      grades: [],
      submissions: [],
    });

    const result = await ClassService.getClassGrades("teacher-1", "class-1");
    expect(result.students[0].averageScore).toBeNull();
    expect(result.students[0].grades[0]).toMatchObject({ score: null, status: "not_started" });
  });
});
