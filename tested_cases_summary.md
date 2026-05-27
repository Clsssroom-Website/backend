# 📋 Danh Sách Các Test Case Đã Được Kiểm Thử (All 131 Tests Pass)

Tài liệu này liệt kê toàn bộ **131 test cases** được viết bằng **Vitest** để kiểm tra hoạt động của hệ thống backend SmartClass. Tất cả các test case đều được cấu hình mock để chạy độc lập không phụ thuộc DB thật hay kết nối Cloud (MinIO/Google API).

---

## 🔍 Tóm Tắt Số Lượng Kiểm Thử

| STT | File / Nhóm kiểm thử | Thư mục / File nguồn | Số test cases | Trạng thái |
|:---:|:---|:---|:---:|:---:|
| 1 | **Class Service** | `src/services/__tests__/class.service.test.ts` | **40** | ✅ Pass |
| 2 | **Student Service** | `src/services/__tests__/student.service.test.ts` | **28** | ✅ Pass |
| 3 | **Assignment Service** | `src/services/__tests__/assignment.service.test.ts` | **15** | ✅ Pass |
| 4 | **Auth Service** | `src/services/__tests__/auth.service.test.ts` | **14** | ✅ Pass |
| 5 | **Document Service** | `src/services/__tests__/document.service.test.ts` | **11** | ✅ Pass |
| 6 | **Document Upload API** | `tests/document/upload.test.ts` | **8** | ✅ Pass |
| 7 | **User Service** | `src/services/__tests__/user.service.test.ts` | **4** | ✅ Pass |
| 8 | **Dashboard Service** | `src/services/__tests__/dashboard.service.test.ts` | **3** | ✅ Pass |
| 9 | **Google Form Service** | `src/services/__tests__/googleFormService.test.ts` | **3** | ✅ Pass |
| 10 | **Email Notifications** | `tests/notification/email.test.ts` | **2** | ✅ Pass |
| **-** | **Tổng Cộng** | **-** | **128 (131 với file JS)** | ✅ **All Pass** |

---

## 🛠️ Chi Tiết Các Test Case Theo Từng Module

### 1. Class Service (`class.service.test.ts` - 40 Tests)
Kiểm thử các tác vụ quản lý lớp học của giáo viên và việc tham gia của học sinh.
* **getAllClassesByTeacherId (4 tests)**:
  * Trả về danh sách lớp học của giáo viên (Lớp đang hoạt động và lớp đã đóng).
  * Trả về mảng rỗng nếu giáo viên chưa tạo lớp nào.
* **createClass (3 tests)**:
  * Tạo lớp học mới thành công với mã `joinCode` ngẫu nhiên.
  * Lỗi `BadRequestError` khi mã `joinCode` tự chọn bị trùng lặp.
* **getClassById (2 tests)**:
  * Trả về thông tin lớp học khi ID hợp lệ.
  * Lỗi `NotFoundError` khi ID lớp không tồn tại.
* **updateClass (3 tests)**:
  * Cập nhật thông tin lớp học thành công (Tên lớp, mô tả, trạng thái).
  * Lỗi `NotFoundError` hoặc `ForbiddenError` khi giáo viên khác chỉnh sửa lớp.
* **deleteClass (3 tests)**:
  * Xóa lớp thành công (Chuyển đổi trạng thái/Xóa khỏi DB).
  * Chặn hành động xóa lớp từ giáo viên không sở hữu lớp.
* **joinClass (4 tests)**:
  * Học sinh tham gia lớp học thành công bằng mã `joinCode`.
  * Chặn tham gia khi lớp học đã bị đóng hoặc mã tham gia sai.
  * Trả về lỗi khi học sinh đã tham gia lớp học này từ trước.
* **getClassStudents (3 tests)**:
  * Trả về danh sách tất cả học sinh đã tham gia lớp kèm thông tin cá nhân.
  * Chặn truy cập nếu người gọi không phải giáo viên quản lý lớp.
* **removeStudentFromClass (4 tests)**:
  * Trục xuất học sinh ra khỏi lớp học thành công.
  * Chặn trục xuất nếu học sinh không ở trong lớp hoặc giáo viên không sở hữu lớp.
* **getJoinedClassesByStudentId (3 tests)**:
  * Lấy danh sách toàn bộ các lớp mà học sinh đã tham gia.
* **getClassStream (5 tests)**:
  * Trả về danh sách các bài đăng (Tài liệu học tập + Bài tập) theo dạng dòng thời gian.
  * Tự động sinh presigned URL để xem các tệp đính kèm đi kèm.

---

### 2. Student Service (`student.service.test.ts` - 28 Tests)
Kiểm thử các hành động của học sinh trong lớp học và tổng hợp điểm số.
* **getClassDetailsForStudent (3 tests)**:
  * Trả về thông tin chi tiết lớp học nhưng ẩn đi mã `joinCode` để bảo mật.
  * Chặn học sinh chưa tham gia lớp xem chi tiết.
* **getAssignmentsForStudent (4 tests)**:
  * Lấy danh sách bài tập được giao cho học sinh.
  * Tự động sinh presigned URL an toàn để xem đề bài từ MinIO.
* **submitAssignment (6 tests)**:
  * Nộp bài tập thành công dưới dạng file đính kèm (Lưu trữ file lên MinIO).
  * Chặn nộp bài khi đã quá hạn (`deadline`).
  * Chặn nộp bài khi học sinh đã nộp trước đó.
  * **Tự động chấm điểm (Auto-grading)** đối với bài tập trắc nghiệm (`MULTIPLE_CHOICE`) bằng cách so khớp đáp án của học sinh với đáp án đúng.
* **getSubmissionAndGrade (5 tests)**:
  * Lấy bài nộp và điểm số tương ứng (Trạng thái: Đã chấm, chưa chấm, chưa nộp).
* **getGradesForStudent (4 tests)**:
  * Lấy bảng điểm tổng hợp của học sinh ở một lớp cụ thể.
* **getStudentDashboard (6 tests)**:
  * Tính toán số lượng bài tập chưa làm, bài tập sắp đến hạn khẩn cấp (còn < 2 ngày).
  * Trả về danh sách lớp học đã tham gia của học sinh.

---

### 3. Assignment Service (`assignment.service.test.ts` - 15 Tests)
Quản lý vòng đời bài tập được giao bởi giáo viên.
* **createAssignment (6 tests)**:
  * Tạo bài tập tự luận (`ESSAY`) thành công không file đính kèm.
  * Tạo bài tập kèm file đề bài (Tải lên MinIO, tạo bản ghi đính kèm).
  * Báo lỗi tiêu đề rỗng hoặc ngày hạn nộp (`deadline`) sai định dạng.
  * Chặn giáo viên khác tạo bài tập trong lớp.
* **getAssignmentsByClassId (2 tests)**:
  * Lấy danh sách bài tập của lớp kèm đếm tổng số bài nộp (`totalSubmissions`).
* **updateAssignment (2 tests)**:
  * Cập nhật thông tin bài tập, hỗ trợ xóa các file đính kèm cũ và thêm mới.
* **deleteAssignment (1 test)**:
  * Xóa hoàn toàn bài tập cùng tất cả tài liệu đính kèm trên MinIO.
* **getSubmissionsByAssignmentId (1 test)**:
  * Giáo viên lấy danh sách bài nộp của học sinh để chuẩn bị chấm điểm.
* **gradeSubmission (3 tests)**:
  * Chấm điểm thành công (Lưu điểm số và lời phê của giáo viên).
  * Lỗi nếu bài nộp không tồn tại hoặc bài nộp không khớp với bài tập chỉ định.

---

### 4. Auth Service (`auth.service.test.ts` - 14 Tests)
Kiểm thử quy trình Đăng ký, Đăng nhập và xác thực bảo mật Token.
* **register (2 tests)**:
  * Đăng ký tài khoản mới thành công (Mã hóa mật khẩu bằng bcrypt).
  * Lỗi trùng lặp email.
* **login (3 tests)**:
  * Đăng nhập thành công, tạo mới cặp token Access Token và Refresh Token.
  * Báo lỗi sai mật khẩu hoặc tài khoản không tồn tại.
* **verifyToken & refreshToken (4 tests)**:
  * Xác thực token hợp lệ/không hợp lệ.
  * Cấp lại Access Token mới khi cung cấp Refresh Token hợp lệ.
* **getMe & logout (5 tests)**:
  * Lấy thông tin cá nhân của phiên đăng nhập hiện tại.
  * Đăng xuất thành công (Hủy bỏ phiên token trong DB).

---

### 5. Document Service (`document.service.test.ts` - 11 Tests)
Quản lý việc chia sẻ tài liệu học tập của giáo viên lên lớp học.
* **uploadDocument (4 tests)**:
  * Giáo viên tải tài liệu học tập mới lên lớp (Lưu file vào MinIO).
  * Chặn tải lên khi không có file đính kèm nào được chọn.
* **getDocumentsByClassId (3 tests)**:
  * Giáo viên hoặc học sinh đã tham gia lớp xem danh sách tài liệu.
  * Chặn học sinh tự do chưa tham gia lớp xem tài liệu lớp học.
* **getAttachmentDownloadUrl (2 tests)**:
  * Tạo presigned URL tải file an toàn.
* **updateDocument & deleteDocument (2 tests)**:
  * Chỉnh sửa mô tả/tài liệu đính kèm hoặc xóa tài liệu học tập.

---

### 6. User Service (`user.service.test.ts` - 4 Tests)
* **getAllUsers (2 tests)**: Lấy danh sách toàn bộ người dùng trong hệ thống (Hỗ trợ trả về danh sách trống khi DB sạch).
* **getUserById (2 tests)**: Lấy chi tiết tài khoản theo ID, ném lỗi `NotFoundError` nếu ID sai.

---

### 7. Dashboard Service (`dashboard.service.test.ts` - 3 Tests)
* **getDashboardStats (1 test)**: Lấy các số liệu thống kê nhanh cho widget dashboard của giáo viên.
* **getTeacherDashboard (2 tests)**:
  * Map dữ liệu các hoạt động gần đây và bài tập sắp đến hạn.
  * Logic tự động phân loại độ khẩn cấp bài tập (`urgent` nếu hạn nộp < 2 ngày, `upcoming` nếu hạn nộp >= 2 ngày).

---

### 8. Google Form Service (`googleFormService.test.ts` - 3 Tests)
* **createQuizForm (3 tests)**:
  * Tạo biểu mẫu Quiz trên Google Forms, cấu hình chế độ tự chấm điểm (Quiz Mode).
  * Chia sẻ quyền Biên tập (Editor) cho email của giáo viên sở hữu lớp qua Google Drive API.
  * Bọc lỗi trả về từ Google API khi có sự cố mạng/quá giới hạn API.

---

### 9. API / Controller Integration Tests (10 Tests)
* **tests/document/upload.test.ts (8 tests)**: Tích hợp từ đầu cuối (End-to-End) các API upload, update, delete tài liệu trên môi trường HTTP mock.
* **tests/notification/email.test.ts (2 tests)**: Kiểm thử bộ lắng nghe sự kiện (`assignmentSubscriber`) tự động gửi email thông báo qua Nodemailer tới tất cả học sinh trong lớp khi có bài tập mới được giao.
