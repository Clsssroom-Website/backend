import { Request, Response } from "express";

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "Không tìm thấy file tải lên." });
      return;
    }

    // Lấy URL hiện tại từ biến môi trường (hoặc fallback)
    const host = req.get("host");
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: "Tải file thành công!",
      data: {
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileSize: req.file.size,
      },
    });
  } catch (error: any) {
    console.error("Lỗi upload file:", error);
    res.status(500).json({ success: false, message: "Lỗi Server nội bộ khi tải file." });
  }
};
