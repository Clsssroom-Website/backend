import { z } from "zod";
export const RegisterSchema = z.object({
    name: z.string().min(1, "Họ tên không được để trống"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    role: z.enum(["student", "teacher"], {
        errorMap: () => ({ message: "Role không hợp lệ" }),
    }),
});
export const LoginSchema = z.object({
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
