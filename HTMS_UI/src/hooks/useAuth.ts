import { useMutation } from "@tanstack/react-query";
import { useNavigate }  from "react-router-dom";
import { loginApi, registerApi, logoutApi } from "../api/authApi";
import type { AuthResponseDto } from "../api/authApi";
import { useAuthStore } from "../store/authStore";
import type { User } from "../store/authStore";

// Map flat AuthResponseDto → User shape của Zustand store
function mapToUser(dto: AuthResponseDto): User {
  return {
    id:        dto.userId,    // Guid → string
    fullName:  dto.fullName,
    email:     dto.email,
    avatarUrl: dto.avatarUrl,
  };
}

export function useAuth() {
  const navigate  = useNavigate();
  const setAuth   = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleAuthSuccess = (dto: AuthResponseDto) => {
    setAuth(mapToUser(dto), dto.token);  // ← dto.token (không phải accessToken)
    navigate("/dashboard");
  };

  const login = useMutation({
    mutationFn: loginApi,
    onSuccess:  handleAuthSuccess,
  });

  const register = useMutation({
    mutationFn: registerApi,
    onSuccess:  handleAuthSuccess,
  });

  const logout = useMutation({
    mutationFn: logoutApi,
    onSettled:  () => {
      clearAuth();
      navigate("/auth");
    },
  });

  return { login, register, logout };
}