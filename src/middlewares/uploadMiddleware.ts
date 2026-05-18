import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/index.js";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
];

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Chỉ chấp nhận định dạng tệp PDF hoặc DOCX."));
    }
  },
});

/**
 * Middleware xử lý upload 1 file và bắt lỗi từ Multer (ví dụ: vượt quá dung lượng)
 */
export const uploadDocumentMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const uploadHandler = upload.single("file");
  
  uploadHandler(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new BadRequestError("Kích thước tệp vượt quá giới hạn 25MB."));
      }
      return next(new BadRequestError(`Lỗi tải tệp: ${err.message}`));
    } else if (err) {
      return next(err); // Bắt lỗi từ fileFilter (ví dụ: sai định dạng)
    }
    next();
  });
};
