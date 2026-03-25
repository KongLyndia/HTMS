import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label?:      string;
  error?:      string;
  children:    ReactNode;
  className?:  string;
  labelRight?: ReactNode;
}

export function FormField({ label, error, children, className, labelRight }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {(label || labelRight) && (
        <div className="flex items-center justify-between px-1">
          {label && (
            <label className="text-[13px] font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
              {label}
            </label>
          )}
          {labelRight && <div className="text-xs">{labelRight}</div>}
        </div>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1.5 px-1 text-[12px] font-medium text-rose-500 animate-[fadeSlideUp_.2s_ease-out_both]">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8"  x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}