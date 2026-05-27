import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleFormService } from "../googleFormService.js";
import fs from "fs";
import { google } from "googleapis";

// ─── Mock Dependencies ────────────────────────────────────────────────────────

// Sử dụng vi.hoisted để khởi tạo các mock functions
const {
  mockFormsCreate,
  mockFormsBatchUpdate,
  mockDrivePermissionsCreate,
  mockExistsSync,
} = vi.hoisted(() => ({
  mockFormsCreate: vi.fn(),
  mockFormsBatchUpdate: vi.fn(),
  mockDrivePermissionsCreate: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(true),
}));

// Mock module googleapis
vi.mock("googleapis", () => {
  return {
    google: {
      auth: {
        GoogleAuth: class {
          constructor() {}
        },
      },
      forms: vi.fn().mockReturnValue({
        forms: {
          create: mockFormsCreate,
          batchUpdate: mockFormsBatchUpdate,
        },
      }),
      drive: vi.fn().mockReturnValue({
        permissions: {
          create: mockDrivePermissionsCreate,
        },
      }),
    },
  };
});

// Mock fs module để giả lập file google-service-account.json tồn tại
vi.mock("fs", () => ({
  default: {
    existsSync: mockExistsSync,
  },
  existsSync: mockExistsSync,
}));

describe("GoogleFormService - createQuizForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create quiz form and share permissions successfully", async () => {
    // 1. Giả lập Google Forms create thành công
    mockFormsCreate.mockResolvedValue({
      data: {
        formId: "mock-form-id-123",
        responderUri: "https://docs.google.com/forms/d/mock-form-id-123/viewform",
      },
    });

    // 2. Giả lập Forms batchUpdate thành công
    mockFormsBatchUpdate.mockResolvedValue({ data: {} });

    // 3. Giả lập Drive permissions create thành công
    mockDrivePermissionsCreate.mockResolvedValue({ data: {} });

    const result = await GoogleFormService.createQuizForm("Bài Kiểm Tra Giữa Kỳ", "teacher@school.edu");

    // Xác nhận kết quả map URI nộp bài và chỉnh sửa
    expect(result).toEqual({
      formId: "mock-form-id-123",
      responderUri: "https://docs.google.com/forms/d/mock-form-id-123/viewform",
      editUri: "https://docs.google.com/forms/d/mock-form-id-123/edit",
    });

    // Xác nhận gọi các API của Google đúng tham số
    expect(mockFormsCreate).toHaveBeenCalledWith({
      requestBody: {
        info: {
          title: "Bài Kiểm Tra Giữa Kỳ",
          documentTitle: "Bài Kiểm Tra Giữa Kỳ",
        },
      },
    });

    expect(mockFormsBatchUpdate).toHaveBeenCalledWith({
      formId: "mock-form-id-123",
      requestBody: {
        requests: [
          {
            updateSettings: {
              settings: {
                quizSettings: {
                  isQuiz: true,
                },
              },
              updateMask: "quizSettings.isQuiz",
            },
          },
        ],
      },
    });

    expect(mockDrivePermissionsCreate).toHaveBeenCalledWith({
      fileId: "mock-form-id-123",
      requestBody: {
        role: "writer",
        type: "user",
        emailAddress: "teacher@school.edu",
      },
      sendNotificationEmail: true,
    });
  });

  it("should throw error if file google-service-account.json does not exist", async () => {
    // Giả lập file key không tồn tại
    mockExistsSync.mockReturnValue(false);

    await expect(GoogleFormService.createQuizForm("Quiz", "teacher@test.com"))
      .rejects.toThrow("Không tìm thấy file google-service-account.json");
  });

  it("should handle and wrap google api exceptions", async () => {
    // Giả lập file tồn tại
    mockExistsSync.mockReturnValue(true);
    // Giả lập lỗi từ API Google
    mockFormsCreate.mockRejectedValue(new Error("API Limit Exceeded"));

    await expect(GoogleFormService.createQuizForm("Quiz", "teacher@test.com"))
      .rejects.toThrow("Lỗi Google API: API Limit Exceeded");
  });
});
