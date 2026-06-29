import { cn } from "@/lib/utils";

export function Card({ children, className, pad, onClick }: {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={cn("card", pad && "p-[18px]", className)} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {action}
    </div>
  );
}
