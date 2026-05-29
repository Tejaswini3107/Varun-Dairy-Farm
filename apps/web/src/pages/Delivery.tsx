import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Modal, Field, selectStyle } from "@/components/ui/Modal";

export default function Delivery() {
  const [assignRoute, setAssignRoute] = useState<{ routeId: string; routeName: string } | null>(null);
  const [staffId, setStaffId] = useState("");
  const qc = useQueryClient();

  const { data: routesRes } = useQuery({
    queryKey: ["delivery-routes"],
    queryFn: () => api.get<{ data: any[] }>("/delivery/routes"),
    refetchInterval: 5000,
  });

  const { data: staffRes } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ data: any[] }>("/staff"),
  });

  const assignAgent = useMutation({
    mutationFn: ({ sid, routeId }: { sid: string; routeId: string }) =>
      api.patch(`/staff/${sid}/assign-route`, { routeId }),
    onSuccess: () => { qc.invalidateQueries(); setAssignRoute(null); setStaffId(""); },
    onError: (e: Error) => alert(e.message),
  });

  const routes = routesRes?.data ?? [];
  const staff = staffRes?.data ?? [];
  const active = routes.filter(r => r.status === "in_progress").length;

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
        {routes.length === 0 && (
          <p className="text-[13px] text-[var(--muted)] py-4 text-center">No routes yet. Generate today's orders first.</p>
        )}
        {routes.map(route => {
          const pct = route.totalStops > 0 ? Math.round((route.completedStops / route.totalStops) * 100) : 0;
          return (
            <div key={route.id} className="flex items-center gap-3.5 py-3.5 border-b border-[var(--border)] last:border-0">
              <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center text-[19px] flex-none ${route.status === "completed" ? "bg-[var(--surface-2)] text-[var(--muted)]" : "bg-[var(--blue-soft)] text-[var(--blue-ink)]"}`}>
                <i className="ti ti-user" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold">
                  {route.agentName ? `${route.agentName} · ` : ""}{route.name}
                </div>
                <div className="text-[12px] text-[var(--muted)]">{route.area} · {route.completedStops}/{route.totalStops} stops</div>
              </div>
              <div className="flex items-center gap-2.5 min-w-[140px]">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--green)] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[13px] font-semibold font-mono w-10 text-right">{pct}%</span>
              </div>
              <div className="ml-2">{statusBadge(route.status)}</div>
              {!route.agentId && (
                <Button onClick={() => { setAssignRoute({ routeId: route.id, routeName: route.name }); setStaffId(""); }}>
                  <i className="ti ti-user-plus text-xs" /> Assign
                </Button>
              )}
            </div>
          );
        })}
      </Card>

      {assignRoute && (
        <Modal title={`Assign agent to ${assignRoute.routeName}`} onClose={() => setAssignRoute(null)} width={380}>
          <Field label="Select delivery agent">
            <select style={selectStyle} value={staffId} onChange={e => setStaffId(e.target.value)}>
              <option value="">Choose agent…</option>
              {staff.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <p className="text-[12px] text-[var(--muted)] mb-3">
            This will assign all pending orders on {assignRoute.routeName} to the selected agent and set them to "Out for delivery".
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setAssignRoute(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={!staffId || assignAgent.isPending}
              onClick={() => assignAgent.mutate({ sid: staffId, routeId: assignRoute.routeId })}>
              {assignAgent.isPending ? "Assigning…" : "Assign & dispatch"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
