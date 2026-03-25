import axios from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/authStore";

const axiosClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || "https://localhost:7004/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
  // Quan trọng: backend C# dev thường dùng self-signed cert
  // → Nếu bị lỗi SSL, tắt verify bằng cách bật dòng dưới (dev only)
  // httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

// ── Request interceptor: gắn JWT ──────────────────────────────────────
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

// ── Response interceptor: unwrap { message, data } ────────────────────
// Backend C# trả về: { message: string, data: T }
// → Interceptor lấy .data.data để component nhận thẳng payload
axiosClient.interceptors.response.use(
  (res: AxiosResponse) => {
    // Nếu response có shape { message, data } thì unwrap
    if (res.data && "data" in res.data) {
      return res.data.data;
    }
    return res.data;
  },
  (error) => {
    const status  = error.response?.status;
    // Lấy message lỗi từ backend: { message: "..." }
    const message = error.response?.data?.message ?? error.message ?? "Đã có lỗi xảy ra";

    if (status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = "/auth";
    }

    // Ném ra object có .message để LoginForm hiển thị được
    return Promise.reject(new Error(message));
  }
);

export default axiosClient;