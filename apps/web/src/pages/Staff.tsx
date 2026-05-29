import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

const ROUTES = [
  { id: "route_1", name: "Route 1 · Jubilee Hills" },
  { id: "route_2", name: "Route 2 · Madhapur" },
  { id: "route_3", name: "Route 3 · Kondapur" },
  { id: "route_4", name: "Route 4 · Banjara Hills" },
  { id: "route_5", name: "Route 5 · Gachibowli" },
  { id: "route_6", name: "Route 6 · Hi-Tech City" },
];

const statusBadge = (s: string) => {
  if (s === "on_road") return <Badge variant="blue"><i className="ti ti-truck-delivery text-[10px]" /> On road</Badge>;
  if (s === "completed") return <Badge variant="green"><i className="ti ti-check text-[10px]" /> Completed</Badge>;
  return <Badge variant="gray">Off duty</Badge>;
};

export default function Staff() {
  const [showAdd, setShowAdd] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ staffId: string; name: string } | null>(null);
  const [routeId, setRouteId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", role: "delivery_agent" });
  const [formErr, setFormErr] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ data: any[] }>("/staff"),
    refetchInterval: 5000,
  });

  const addStaff = useMutation({
    mutationFn: (body: any) => api.post("/staff", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); setShowAdd(false); setForm({ name: "", phone: "", role: "delivery_agent" }); },
    onError: (e: Error) => setFormErr(e.message),
  });

  const assignRoute = useMutation({
    mutationFn: ({ staffId, routeId }: { staffId: string; routeId: string }) =>
      api.patch(`/staff/${staffId}/assign-route`, { routeId }),
    onSuccess: () => { qc.invalidateQueries(); setAssignTarget(null); setRouteId(""); },
    onError: (e: Error) => alert(e.message),
  });

  const staff = data?.data ?? [];

  return (
    <div className="animate-fade">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Staff management</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">{staff.length} agents</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}><i className="ti ti-plus" /> Add staff</Button>
      </div>

      <Card>
        <table className="w-full border-collapse">
          <thead>
            <tr>{["Agent", "Route", "Today's deliveries", "Collection", "Status", "Actions"].map(h => (
              <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 pt-3 font-semibold">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-3.5 py-3.5 border-t border-[var(--border)]"><div className="h-4 bg-[var(--surface-2)] rounded animate-pulse" /></td>
              ))}</tr>
            )) : staff.map((s: any) => (
              <tr key={s.id} className="hover:bg-[var(--surface-2)]">
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[var(--blue-soft)] text-[var(--blue-ink)] grid place-items-center text-[12px] font-semibold flex-none">
                      {initials(s.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-[13.5px]">{s.name}</div>
                      <div className="text-[11.5px] text-[var(--muted)]">{s.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">
                  {s.routeName ?? <span className="text-[var(--muted)]">Unassigned</span>}
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono text-[13.5px]">
                  {s.completedDeliveries} / {s.totalStops}
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">
                  {fmt(s.totalCollection)}
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">{statusBadge(s.status)}</td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                  <Button onClick={() => { setAssignTarget({ staffId: s.id, name: s.name }); setRouteId(""); }}>
                    <i className="ti ti-route text-xs" /> Assign route
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showAdd && (
        <Modal title="Add delivery staff" onClose={() => { setShowAdd(false); setFormErr(""); }} width={380}>
          <Field label="Full name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus /></Field>
          <Field label="Mobile number"><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} /></Field>
          <Field label="Role">
            <select style={selectStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="delivery_agent">Delivery agent</option>
              <option value="manager">Manager</option>
            </select>
          </Field>
          {formErr && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{formErr}</p>}
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => {
              if (!form.name || form.phone.length !== 10) { setFormErr("Name and 10-digit phone required"); return; }
              addStaff.mutate(form);
            }} disabled={addStaff.isPending}>{addStaff.isPending ? "Adding…" : "Add staff"}</Button>
          </div>
        </Modal>
      )}

      {assignTarget && (
        <Modal title={`Assign route to ${assignTarget.name}`} onClose={() => setAssignTarget(null)} width={380}>
          <Field label="Select route">
            <select style={selectStyle} value={routeId} onChange={e => setRouteId(e.target.value)}>
              <option value="">Choose route…</option>
              {ROUTES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={!routeId || assignRoute.isPending}
              onClick={() => assignRoute.mutate({ staffId: assignTarget.staffId, routeId })}>
              {assignRoute.isPending ? "Assigning…" : "Assign & dispatch"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
