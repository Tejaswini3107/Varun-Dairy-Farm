import { cn } from "@/lib/utils";

type Variant = "green" | "amber" | "blue" | "red" | "gray";

const styles: Record<Variant, string> = {
  green: "bg-[var(--green-soft)] text-[var(--green-ink)]",
  amber: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
  blue: "bg-[var(--blue-soft)] text-[var(--blue-ink)]",
  red: "bg-[var(--red-soft)] text-[var(--red-ink)]",
  gray: "bg-[var(--surface-2)] text-[var(--muted)]",
};

export function Badge({ variant = "gray", children, className }: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-0.5 rounded-full",
      styles[variant],
      className
    )}>
      {children}
    </span>
  );
}
