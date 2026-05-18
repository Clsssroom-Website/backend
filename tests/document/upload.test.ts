import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentService } from "../../src/services/documentService.js";
import { ForbiddenError, NotFoundError, BadRequestError } from "../../src/errors/index.js";
import prisma from "../../src/config/prisma.js";

// Mock dependencies
vi.mock("../../src/config/prisma.js", () => ({
  default: {
    classes: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/repositories/document.repo.js", () => {
  return {
    DocumentRepository: class {
      createDocumentWithAttachment = vi.fn().mockResolvedValue({
        documentId: "doc-123",
        classId: "class-123",
        title: "Test Doc",
        description: "Test Desc",
        DocumentAttachments: [
          { attachmentId: "att-123", fileName: "test.pdf", fileUri: "url/test.pdf", fileSize: 1024n }
        ]
      })
    }
  };
});

vi.mock("../../src/services/storage/minioStorage.js", () => {
  return {
    MinioStorageService: class {
      uploadFile = vi.fn().mockResolvedValue({ url: "url/test.pdf", size: 1024 })
    }
  };
});

describe("DocumentService - uploadDocument", () => {
  let documentService: DocumentService;

  beforeEach(() => {
    vi.clearAllMocks();
    documentService = new DocumentService();
  });

  it("should upload a document successfully", async () => {
    // Arrange
    (prisma.classes.findUnique as any).mockResolvedValue({ teacherId: "teacher-123" });
    const fileBuffer = Buffer.from("test content");

    // Act
    const result = await documentService.uploadDocument(
      "teacher-123",
      "class-123",
      "Test Doc",
      "Test Desc",
      fileBuffer,
      "test.pdf",
      "application/pdf",
      fileBuffer.length
    );

    // Assert
    expect(result).toBeDefined();
    expect(result.documentId).toBe("doc-123");
    expect(result.DocumentAttachments[0].fileSize).toBe("1024");
  });

  it("should throw NotFoundError if class does not exist", async () => {
    // Arrange
    (prisma.classes.findUnique as any).mockResolvedValue(null);
    const fileBuffer = Buffer.from("test content");

    // Act & Assert
    await expect(documentService.uploadDocument(
      "teacher-123", "class-123", "Test", "Test", fileBuffer, "test.pdf", "application/pdf", fileBuffer.length
    )).rejects.toThrow(NotFoundError);
  });

  it("should throw ForbiddenError if user is not the teacher of the class", async () => {
    // Arrange
    (prisma.classes.findUnique as any).mockResolvedValue({ teacherId: "another-teacher" });
    const fileBuffer = Buffer.from("test content");

    // Act & Assert
    await expect(documentService.uploadDocument(
      "teacher-123", "class-123", "Test", "Test", fileBuffer, "test.pdf", "application/pdf", fileBuffer.length
    )).rejects.toThrow(ForbiddenError);
  });

  it("should throw BadRequestError if file buffer is empty", async () => {
    // Arrange
    (prisma.classes.findUnique as any).mockResolvedValue({ teacherId: "teacher-123" });
    const emptyBuffer = Buffer.from("");

    // Act & Assert
    await expect(documentService.uploadDocument(
      "teacher-123", "class-123", "Test", "Test", emptyBuffer, "test.pdf", "application/pdf", 0
    )).rejects.toThrow(BadRequestError);
  });
});
