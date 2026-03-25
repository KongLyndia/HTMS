import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

// ── User — không có role hệ thống (role theo Project) ─────────────────
export interface User {
  id:        string;   // Guid từ C#
  fullName:  string;
  email:     string;
  avatarUrl?: string;
}

interface AuthState {
  user:            User | null;
  accessToken:     string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth:    (user: User, accessToken: string) => void;
  clearAuth:  () => void;
  updateUser: (partial: Partial<User>) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        user:            null,
        accessToken:     null,
        isAuthenticated: false,

        setAuth: (user, accessToken) =>
          set({ user, accessToken, isAuthenticated: true }, false, "setAuth"),

        clearAuth: () =>
          set({ user: null, accessToken: null, isAuthenticated: false }, false, "clearAuth"),

        updateUser: (partial) =>
          set(
            (state) => ({ user: state.user ? { ...state.user, ...partial } : null }),
            false,
            "updateUser"
          ),
      }),
      {
        name: "taskflow-auth",
        partialize: (state): AuthState => ({
          user:            state.user,
          accessToken:     state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);