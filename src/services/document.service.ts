import { DocumentRepository } from "../repositories/document.repo.js";
import { MinioStorageService, IStorageService } from "./storage/minioStorage.js";
import { ForbiddenError, NotFoundError, BadRequestError } from "../errors/index.js";
import prisma from "../config/prisma.js";

export class DocumentService {
  private documentRepo: DocumentRepository;
  private storageService: IStorageService;

  constructor() {
    this.documentRepo = new DocumentRepository();
    this.storageService = new MinioStorageService();
  }

  public async uploadDocument(
    userId: string,
    classId: string,
    title: string,
    description: string | undefined,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    size: number
  ) {
    // 1. Validate if class exists and user is the teacher
    const classRecord = await prisma.classes.findUnique({
      where: { classId },
      select: { teacherId: true },
    });

    if (!classRecord) {
      throw new NotFoundError("Lớp học không tồn tại.");
    }

    if (classRecord.teacherId !== userId) {
      throw new ForbiddenError("Bạn không có quyền tải tài liệu lên lớp học này.");
    }

    // 2. Additional File Validation (Zod/Multer handles basics, but we can do extra checks if needed)
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestError("File không hợp lệ hoặc rỗng.");
    }

    // 3. Upload to MinIO
    const uploadResult = await this.storageService.uploadFile(fileBuffer, originalName, mimeType);

    // 4. Save metadata in the database
    const document = await this.documentRepo.createDocumentWithAttachment({
      classId,
      title,
      description,
      attachment: {
        fileName: originalName,
        fileUri: uploadResult.url,
        fileSize: uploadResult.size,
      },
    });

    // We convert BigInt to string for JSON serialization
    const serializedDocument = {
      ...document,
      DocumentAttachments: document.DocumentAttachments.map(att => ({
        ...att,
        fileSize: att.fileSize ? att.fileSize.toString() : null,
      }))
    };

    return serializedDocument;
  }

  public async getDocumentsByClassId(userId: string, classId: string) {
    // 1. Verify class and permission (Teacher or enrolled Student)
    const classRecord = await prisma.classes.findUnique({
      where: { classId },
      include: {
        ClassEnrollments: {
          where: { studentId: userId, status: "JOINED" }
        }
      }
    });

    if (!classRecord) {
      throw new NotFoundError("Lớp học không tồn tại.");
    }

    if (classRecord.teacherId !== userId && classRecord.ClassEnrollments.length === 0) {
      throw new ForbiddenError("Bạn không có quyền xem tài liệu của lớp học này.");
    }

    // 2. Fetch documents
    const documents = await this.documentRepo.getDocumentsByClassId(classId);

    // 3. Serialize BigInt
    return documents.map(doc => ({
      ...doc,
      DocumentAttachments: doc.DocumentAttachments.map(att => ({
        ...att,
        fileSize: att.fileSize ? att.fileSize.toString() : null,
      }))
    }));
  }

  public async getDownloadUrl(userId: string, documentId: string, action?: string): Promise<string> {
    const document = await this.documentRepo.getDocumentById(documentId);
    if (!document) {
      throw new NotFoundError("Tài liệu không tồn tại.");
    }

    const classRecord = await prisma.classes.findUnique({
      where: { classId: document.classId },
      include: {
        ClassEnrollments: {
          where: { studentId: userId, status: "JOINED" }
        }
      }
    });

    if (!classRecord) {
      throw new NotFoundError("Lớp học không tồn tại.");
    }

    if (classRecord.teacherId !== userId && classRecord.ClassEnrollments.length === 0) {
      throw new ForbiddenError("Bạn không có quyền tải tài liệu này.");
    }

    const attachment = document.DocumentAttachments[0];
    if (!attachment) {
      throw new NotFoundError("Tài liệu không có file đính kèm.");
    }

    const forceDownload = action === "download";
    return await this.storageService.getPresignedUrl(attachment.fileUri, forceDownload, attachment.fileName || undefined);
  }
}
