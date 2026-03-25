import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";
import type { InputProps } from "./Input";
import { cn } from "@/lib/utils";

const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative group">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          error={error}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
            "text-slate-400 hover:text-teal-600 hover:bg-teal-50",
            "dark:hover:text-teal-400 dark:hover:bg-white/5"
          )}
        >
          {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
export { PasswordInput };