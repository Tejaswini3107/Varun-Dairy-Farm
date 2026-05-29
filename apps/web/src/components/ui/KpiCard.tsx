import { cn } from "@/lib/utils";

export function KpiCard({ label, value, delta, deltaUp, icon, iconBg }: {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  icon: string;
  iconBg?: string;
}) {
  return (
    <div className="card p-[17px] flex flex-col gap-1">
      <span className="text-[12.5px] text-[var(--muted)] font-medium flex items-center gap-1.5">
        <span className={cn("w-[26px] h-[26px] rounded-lg flex items-center justify-center text-sm", iconBg ?? "bg-[var(--blue-soft)] text-[var(--blue-ink)]")}>
          <i className={`ti ${icon}`} />
        </span>
        {label}
      </span>
      <span className="text-[27px] font-semibold tracking-tight font-mono">{value}</span>
      {delta && (
        <span className={cn("text-xs font-semibold flex items-center gap-1", deltaUp ? "text-[var(--green-ink)]" : "text-[var(--amber-ink)]")}>
          {deltaUp && <i className="ti ti-trending-up text-xs" />}
          {delta}
        </span>
      )}
    </div>
  );
}
