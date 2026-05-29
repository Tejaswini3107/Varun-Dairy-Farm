export function LiveBadge({ label = "Live sync on" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--green-ink)] bg-[var(--green-soft)] px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse-dot" />
      {label}
    </span>
  );
}
