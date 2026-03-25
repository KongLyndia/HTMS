import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";

import { loginSchema} from "@/utils/authSchemas";
import type { LoginDTO } from "@/utils/authSchemas";
import { useAuth }               from "@/hooks/useAuth";
import { Input }                 from "@/components/ui/Input";
import { Button }                from "@/components/ui/Button";
import { FormField }             from "@/components/ui/FormField";
import { PasswordInput }         from "@/components/ui/PasswordInput";

// ── Props ─────────────────────────────────────────────────────────────
interface LoginFormProps {
  onSwitch: () => void;
}

export default function LoginForm({ onSwitch }: LoginFormProps) {
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDTO>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginDTO) => login.mutate(data);

  // Lỗi trả về từ server C# (vd: "Sai email hoặc mật khẩu")
  const serverError = (login.error as { message?: string })?.message;

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* ── Header ── */}
      <div className="mb-7">
        <motion.span
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4
                     bg-teal-50 dark:bg-teal-500/10
                     border border-teal-200 dark:border-teal-500/20"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 tracking-widest">
            HỆ THỐNG QUẢN LÝ CÔNG VIỆC
          </span>
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[28px] font-bold text-slate-700 dark:text-white tracking-tight"
        >
          Chào mừng trở lại!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-1 text-sm text-slate-500 dark:text-slate-400"
        >
          Đăng nhập để tiếp tục.
        </motion.p>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        {/* Server error banner */}
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30
                       bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400"
          >
            <span>⚠</span> {serverError}
          </motion.div>
        )}

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <FormField label="Email" error={errors.email?.message}>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                type="email"
                placeholder="Nhập email của bạn"
                error={!!errors.email}
                className="pl-10"
                {...register("email")}
              />
            </div>
          </FormField>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
        >
          <FormField
            label="Mật khẩu"
            error={errors.password?.message}
            labelRight={
              <a
                href="#"
                className="text-teal-600 dark:text-teal-400 hover:underline underline-offset-2 font-medium"
              >
                Quên mật khẩu?
              </a>
            }
          >
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <PasswordInput
                placeholder="Nhập mật khẩu của bạn"
                error={!!errors.password}
                className="pl-10"
                {...register("password")}
              />
            </div>
          </FormField>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-1"
        >
          <Button
            type="submit"
            size="lg"
            disabled={login.isPending}
            className="w-full"
          >
            {login.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Đang đăng nhập...</>
            ) : (
              <>Đăng nhập <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </motion.div>
      </form>

      {/* ── Footer ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.36 }}
        className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Chưa có tài khoản?{" "}
        <button
          onClick={onSwitch}
          className="font-semibold text-teal-600 dark:text-teal-400 hover:underline underline-offset-2 transition-colors"
        >
          Đăng ký ngay
        </button>
      </motion.p>
    </motion.div>
  );
}