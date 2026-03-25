import { z } from "zod";

// ── LoginRequestDto C#: { Email, Password } ───────────────────────────
export const loginSchema = z.object({
  email:    z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

// ── RegisterRequestDto C#: { FullName, Email, Password } ─────────────
export const registerSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email:    z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export type LoginDTO    = z.infer<typeof loginSchema>;
export type RegisterDTO = z.infer<typeof registerSchema>;