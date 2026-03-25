import axiosClient from "./axiosClient";
import type { LoginDTO, RegisterDTO } from "../utils/authSchemas";

// ── Khớp 1:1 với AuthResponseDto C# ───────────────────────────────────
// public class AuthResponseDto {
//   public string Token      { get; set; }   ← JWT
//   public Guid   UserId     { get; set; }
//   public string Email      { get; set; }
//   public string FullName   { get; set; }
//   public string? AvatarUrl { get; set; }
// }
// Lưu ý: Role không có trong token (role theo từng Project)
export interface AuthResponseDto {
  token:     string;
  userId:    string;
  email:     string;
  fullName:  string;
  avatarUrl?: string;
}

export const loginApi    = (dto: LoginDTO):    Promise<AuthResponseDto> =>
  axiosClient.post("/auth/login", dto);

export const registerApi = (dto: RegisterDTO): Promise<AuthResponseDto> =>
  axiosClient.post("/auth/register", dto);

export const logoutApi   = (): Promise<void> =>
  axiosClient.post("/auth/logout");