import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LiveBadge } from "@/components/ui/LiveBadge";

const MOCK_ROUTES = [
  { id: "r1", name: "Deepak R · Route 1", area: "Jubilee Hills · 44 stops · completed", totalStops: 44, completedStops: 44, status: "completed" as const, agentName: "Deepak R" },
  { id: "r3", name: "Sanjay Kumar · Route 3", area: "Kondapur · 42 stops · next: Priya Sharma", totalStops: 42, completedStops: 18, status: "in_progress" as const, agentName: "Sanjay Kumar" },
  { id: "r5", name: "Amit Mishra · Route 5", area: "Gachibowli · 38 stops · next: Anjali Rao", totalStops: 38, completedStops: 23, status: "in_progress" as const, agentName: "Amit Mishra" },
  { id: "r2", name: "Ravi · Route 2", area: "Madhapur · 36 stops", totalStops: 36, completedStops: 0, status: "not_started" as const, agentName: "Ravi" },
];

export default function Delivery() {
  const { data } = useQuery({
    queryKey: ["delivery-routes"],
    queryFn: () => api.get<{ data: typeof MOCK_ROUTES }>("/delivery/routes"),
    placeholderData: { data: MOCK_ROUTES },
  });

  const routes = data?.data ?? [];
  const active = routes.filter((r) => r.status === "in_progress").length;

  const statusBadge = (s: string) => {
    if (s === "completed") return <Badge variant="green"><i className="ti ti-check text-[10px]" /> Done</Badge>;
    if (s === "in_progress") return <Badge variant="blue"><i className="ti ti-truck-delivery text-[10px]" /> Live</Badge>;
    return <Badge variant="gray">Not started</Badge>;
  };

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Delivery operations</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Live route tracking · dispatch &amp; status</p>
        </div>
        <LiveBadge label={`${active} agents on road`} />
      </div>

      <Card pad>
        {routes.map((route) => {
          const pct = Math.round((route.completedStops / route.totalStops) * 100);
          return (
            <div key={route.id} className="flex items-center gap-3.5 py-3.5 border-b border-[var(--border)] last:border-0">
              <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center text-[19px] flex-none ${route.status === "completed" ? "bg-[var(--surface-2)] text-[var(--muted)]" : "bg-[var(--blue-soft)] text-[var(--blue-ink)]"}`}>
                <i className="ti ti-user" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold">{route.name}</div>
                <div className="text-[12px] text-[var(--muted)]">{route.area}</div>
              </div>
              <div className="flex items-center gap-2.5 min-w-[160px]">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--green)] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[13px] font-semibold font-mono w-10 text-right">{pct}%</span>
              </div>
              <div className="ml-2">{statusBadge(route.status)}</div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
