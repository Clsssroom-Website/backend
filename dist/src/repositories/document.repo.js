import prisma from "../config/prisma.js";
import { v4 as uuidv4 } from "uuid";
export class DocumentRepository {
    /**
     * Creates a Document and its associated DocumentAttachment in a transaction
     */
    async createDocumentWithAttachment(data) {
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
    async getDocumentById(documentId) {
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
    async getDocumentsByClassId(classId) {
        return await prisma.documents.findMany({
            where: { classId },
            include: {
                DocumentAttachments: true,
            },
            orderBy: { uploadTime: 'desc' },
        });
    }
}
