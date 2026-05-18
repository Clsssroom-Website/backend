import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";
import { Documents, DocumentAttachments } from "@prisma/client";

export class DocumentRepository {
  /**
   * Creates a Document and its associated DocumentAttachment in a transaction
   */
  public async createDocumentWithAttachment(data: {
    classId: string;
    title: string;
    description?: string;
    attachment: {
      fileName: string;
      fileUri: string;
      fileSize: number;
    };
  }): Promise<Documents & { DocumentAttachments: DocumentAttachments[] }> {
    const documentId = uuidv4();
    const attachmentId = uuidv4();

    return await prisma.$transaction(async (tx) => {
      const document = await tx.documents.create({
        data: {
          documentId,
          classId: data.classId,
          title: data.title,
          description: data.description,
          DocumentAttachments: {
            create: {
              attachmentId,
              fileName: data.attachment.fileName,
              fileUri: data.attachment.fileUri,
              fileSize: BigInt(data.attachment.fileSize),
            },
          },
        },
        include: {
          DocumentAttachments: true,
        },
      });

      return document;
    });
  }

  /**
   * Finds a document by its ID
   */
  public async getDocumentById(documentId: string) {
    return await prisma.documents.findUnique({
      where: { documentId },
      include: {
        DocumentAttachments: true,
      },
    });
  }

  /**
   * Retrieves all documents for a specific class, ordered by upload time descending
   */
  public async getDocumentsByClassId(classId: string) {
    return await prisma.documents.findMany({
      where: { classId },
      include: {
        DocumentAttachments: true,
      },
      orderBy: { uploadTime: 'desc' },
    });
  }
}
