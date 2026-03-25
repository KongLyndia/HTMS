import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-12 w-full rounded-xl px-4 py-2 text-sm transition-all duration-200 outline-none border-2",
          // Light Mode: Nền trắng mờ (glassmorphism) để nổi bật trên nền pastel
          "bg-white/80 backdrop-blur-sm text-slate-900 placeholder:text-slate-400",
          "border-teal-100/80 hover:border-teal-200 focus:border-teal-500",
          "focus:ring-4 focus:ring-teal-500/10 shadow-sm",
          // Dark Mode
          "dark:bg-slate-950/50 dark:border-white/10 dark:text-white",
          "dark:hover:border-white/20 dark:focus:border-teal-500/50",
          // Error State
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/50",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export { Input };