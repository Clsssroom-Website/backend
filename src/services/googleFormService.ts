import { google } from "googleapis";
import path from "path";
import fs from "fs";

const KEY_FILE = "google-service-account.json";

export class GoogleFormService {
  private static getAuthClient() {
    const keyPath = path.join(process.cwd(), KEY_FILE);
    if (!fs.existsSync(keyPath)) {
      throw new Error(
        "Không tìm thấy file google-service-account.json tại thư mục gốc backend. Vui lòng cấu hình tài khoản dịch vụ Google API."
      );
    }
    
    return new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        "https://www.googleapis.com/auth/forms.body",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file"
      ],
    });
  }

  /**
   * Tạo một Google Form dạng bài kiểm tra (Quiz) mới và chia sẻ quyền chỉnh sửa cho giáo viên
   * @param title Tiêu đề bài tập
   * @param teacherEmail Email của giáo viên nhận quyền chỉnh sửa
   */
  public static async createQuizForm(title: string, teacherEmail: string) {
    try {
      const auth = this.getAuthClient();
      const forms = google.forms({ version: "v1", auth });
      const drive = google.drive({ version: "v3", auth });

      // 1. Tạo biểu mẫu mới
      const createRes = await forms.forms.create({
        requestBody: {
          info: {
            title: title,
            documentTitle: title,
          },
        },
      });

      const formId = createRes.data.formId;
      if (!formId) {
        throw new Error("Không thể khởi tạo Form ID từ Google API.");
      }

      // 2. Cấu hình thành Quiz (Bài kiểm tra trắc nghiệm) để Google tự chấm điểm
      await forms.forms.batchUpdate({
        formId,
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

      // 3. Sử dụng Google Drive API chia sẻ quyền Editor cho email của giáo viên
      await drive.permissions.create({
        fileId: formId,
        requestBody: {
          role: "writer",
          type: "user",
          emailAddress: teacherEmail,
        },
        sendNotificationEmail: true,
      });

      // responderUri: Link cho học sinh làm bài
      // editUri: Link cho giáo viên chỉnh sửa câu hỏi
      return {
        formId,
        responderUri: createRes.data.responderUri,
        editUri: `https://docs.google.com/forms/d/${formId}/edit`,
      };
    } catch (error: any) {
      console.error("Lỗi khi gọi Google Forms/Drive API:", error);
      throw new Error(`Lỗi Google API: ${error.message || error}`);
    }
  }
}
