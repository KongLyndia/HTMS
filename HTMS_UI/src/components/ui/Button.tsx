import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "outline";
type ButtonSize    = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-teal-600 to-teal-500 text-white " +
    "hover:from-teal-700 hover:to-teal-600 active:scale-[0.98] " +
    "shadow-[0_4px_14px_0_rgba(13,148,136,0.39)] hover:shadow-[0_6px_20px_rgba(13,148,136,0.23)] " +
    "hover:-translate-y-0.5 transition-all duration-200 " +
    "disabled:from-teal-300 disabled:to-teal-400 disabled:shadow-none",
  ghost:
    "bg-transparent text-slate-700 hover:bg-teal-500/10 " +
    "dark:text-slate-300 dark:hover:bg-white/10",
  outline:
    "border-2 border-teal-600/20 dark:border-white/10 " +
    "bg-white/40 dark:bg-white/5 text-teal-700 dark:text-slate-300 " +
    "hover:border-teal-600/40 hover:bg-white/80 dark:hover:bg-white/10 " +
    "backdrop-blur-md shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:   "h-9  px-4 text-xs  rounded-lg",
  md:   "h-11 px-5 text-sm  rounded-xl",
  lg:   "h-12 px-8 text-base rounded-xl font-bold",
  icon: "h-10 w-10          rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200",
          "disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };