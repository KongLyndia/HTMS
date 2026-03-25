import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sun, Moon, CheckSquare } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import LoginForm    from "./LoginForm";
import RegisterForm from "./RegisterForm";
import { Button }   from "@/components/ui/Button";

// ── Types ──────────────────────────────────────────────────────────────
type AuthMode = "login" | "register";

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

// ── Màu nền chung cho cả 2 panel ──────────────────────────────────────
// Light: slate-100 (#f1f5f9) — xám trắng nhẹ
// Dark:  #0b1221 — xanh đen (khớp với panel trái)
const BG_LIGHT = "#f0fdfa";
const BG_DARK  = "#020617";

// ── Theme Store ────────────────────────────────────────────────────────
const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggle: () =>
        set((s) => {
          const next = !s.isDark;
          document.documentElement.classList.toggle("dark", next);
          return { isDark: next };
        }),
    }),
    {
      name: "taskflow-theme",
      onRehydrateStorage: () => (state) => {
        if (state?.isDark) document.documentElement.classList.add("dark");
      },
    }
  )
);

// ── Floating dots ──────────────────────────────────────────────────────
function FloatingDots() {
  const dots = [
    { size: 3, top: "18%", left: "12%", delay: 0,   dur: 6   },
    { size: 2, top: "35%", left: "78%", delay: 1.2, dur: 8   },
    { size: 4, top: "62%", left: "20%", delay: 0.6, dur: 7   },
    { size: 2, top: "75%", left: "65%", delay: 2,   dur: 9   },
    { size: 3, top: "48%", left: "88%", delay: 0.3, dur: 6.5 },
    { size: 2, top: "82%", left: "38%", delay: 1.5, dur: 7.5 },
    { size: 5, top: "22%", left: "55%", delay: 0.8, dur: 10  },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ width: d.size, height: d.size, top: d.top, left: d.left, background: "rgba(45,212,191,.3)" }}
          animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}


// ── Graphic Panel ──────────────────────────────────────────────────────
function GraphicPanel({ isDark }: { isDark: boolean }) {
  // Light mode: gradient xanh nhạt → teal nhạt để hòa với nền slate-100
  // Dark mode:  gradient tối quen thuộc
  const bg = isDark
    ? "linear-gradient(150deg, #0b1221 0%, #052522 60%, #0b1221 100%)"
    : "linear-gradient(150deg, #e2f4f1 0%, #c8ede8 55%, #ddf1ee 100%)";

  return (
    <div
      className="hidden lg:flex lg:w-[42%] h-full relative overflow-hidden flex-col justify-between p-10 transition-all duration-500"
      style={{ background: bg }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(13,148,136,.08) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(13,148,136,.08) 1px,transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Orbs */}
      <div className="absolute top-[-25%] left-[-15%] w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(circle,rgba(13,148,136,.16) 0%,transparent 70%)"
            : "radial-gradient(circle,rgba(13,148,136,.12) 0%,transparent 70%)",
          animation: "orbFloat 11s ease-in-out infinite",
        }}
      />
      <div className="absolute bottom-[-20%] right-[-10%] w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(circle,rgba(16,185,129,.1) 0%,transparent 70%)"
            : "radial-gradient(circle,rgba(16,185,129,.08) 0%,transparent 70%)",
          animation: "orbFloat 14s 3s ease-in-out infinite",
        }}
      />

      {isDark && <FloatingDots />}

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#0d9488", boxShadow: "0 4px 14px rgba(13,148,136,.4)" }}
        >
          <CheckSquare className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight text-[32px]"
          style={{ color: isDark ? "#f8fafc" : "#0f4f48" }}
        >
          Nex<span style={{ color: "#0d9488" }}>Us</span>
        </span>
      </motion.div>

      {/* Center */}
      <div className="relative z-10 flex-1 flex flex-col justify-center gap-10">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-[32px] font-bold leading-snug mb-4"
            style={{ fontFamily: "'Be Vietnam Pro', serif", color: isDark ? "#f8fafc" : "#0f4f48" }}
          >
           Từ ý tưởng đến thực thi<br />
            <span style={{
              background: "linear-gradient(90deg,#0d9488,#059669)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Không khoảng cách
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            className="flex items-start gap-2.5"
          >
            <span className="text-3xl leading-none mt-[-4px] flex-shrink-0"
              style={{ color: "rgba(13,148,136,.4)", fontFamily: "Be Vietnam Pro" }}
            >"</span>
            <p className="text-[13px] leading-relaxed"
              style={{ color: isDark ? "#fafdf8" : "rgba(6, 51, 46, 0.65)" }}
            >
              Quản trị thông minh — Khơi nguồn hiệu suất.
              <span className="text-3xl leading-none mt-[-4px] flex-shrink-0"
              style={{ color: "rgba(13,148,136,.4)", fontFamily: "Be Vietnam Pro" }}
            >"</span>
            </p>
          </motion.div>
        </div>

        
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
        className="relative z-10 text-[11px]"
        style={{ color: isDark ? "rgba(96, 120, 154, 0.7)" : "rgba(71, 141, 133, 0.4)" }}
      >
        2026 Nexus· Hybrid Task Management System
      </motion.p>
    </div>
  );
}

// ── Theme Toggle ───────────────────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggle } = useThemeStore();
  return (
    <Button
      variant="outline" size="icon" onClick={toggle}
      aria-label="Chuyển chế độ sáng/tối"
      className="absolute top-4 right-4 z-50"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.span key="sun"
            initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}
          >
            <Sun className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span key="moon"
            initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}
          >
            <Moon className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

// ── AuthPage ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode]   = useState<AuthMode>("login");
  const { isDark }        = useThemeStore();

  const tabs: { key: AuthMode; label: string }[] = [
    { key: "login",    label: "Đăng nhập" },
    { key: "register", label: "Đăng ký"   },
  ];

  // Màu nền panel phải khớp với panel trái
  const formBg = isDark ? BG_DARK : BG_LIGHT;

  return (
    <div
      className="h-screen w-screen flex overflow-hidden transition-colors duration-500 relative"
      style={{ background: formBg }}
    >
      <ThemeToggle />
      <GraphicPanel isDark={isDark} />

      {/* ── Form Panel ── */}
      <div
        className="flex-1 h-full flex flex-col items-center justify-center px-8 py-12 relative overflow-y-auto transition-colors duration-500"
        style={{ background: formBg }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-600">
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ color: isDark ? "#fff" : "#0f4f48" }}>
            Task<span className="text-teal-600">Flow</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-[400px]"
        >
          {/* Tabs */}
          <div
            className="flex rounded-xl p-1 mb-8 border transition-colors duration-500"
            style={{
              background:   isDark ? "rgba(255,255,255,.05)" : "rgba(13,148,136,.08)",
              borderColor:  isDark ? "rgba(255,255,255,.08)" : "rgba(13,148,136,.15)",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMode(tab.key)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
                style={
                  mode === tab.key
                    ? {
                        background: isDark ? "rgba(255,255,255,.1)" : "#f8fafc",
                        color:      "#0d9488",
                        boxShadow:  isDark ? "0 1px 4px rgba(0,0,0,.3)" : "0 1px 4px rgba(0,0,0,.08)",
                      }
                    : {
                        color: isDark ? "rgba(148,163,184,.7)" : "rgba(15,79,72,.5)",
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Animated form swap */}
          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <LoginForm    key="login"    onSwitch={() => setMode("register")} />
            ) : (
              <RegisterForm key="register" onSwitch={() => setMode("login")} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}