import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-[var(--blue)] text-white hover:bg-[var(--blue-bright)]",
  ghost: "bg-[var(--surface)] border border-[var(--border-2)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--red)] text-white hover:opacity-90",
};

export function Button({ variant = "ghost", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
