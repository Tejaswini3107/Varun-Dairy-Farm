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

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function Staff() {
  const [tab, setTab] = useState<"team" | "attendance">("team");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<{ staffId: string } | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "delivery_agent" });
  const [editErr, setEditErr] = useState("");
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

  const { data: attendanceRes, isLoading: attLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => api.get<{ data: any[] }>("/delivery/attendance"),
    refetchInterval: 15000,
    enabled: tab === "attendance",
  });

  const addStaff = useMutation({
    mutationFn: (body: any) => api.post("/staff", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); setShowAdd(false); setForm({ name: "", phone: "", role: "delivery_agent" }); },
    onError: (e: Error) => setFormErr(e.message),
  });

  const updateStaff = useMutation({
    mutationFn: ({ staffId, body }: { staffId: string; body: any }) => api.patch(`/staff/${staffId}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); setEditTarget(null); },
    onError: (e: Error) => setEditErr(e.message),
  });

  const assignRoute = useMutation({
    mutationFn: ({ staffId, routeId }: { staffId: string; routeId: string }) =>
      api.patch(`/staff/${staffId}/assign-route`, { routeId }),
    onSuccess: () => { qc.invalidateQueries(); setAssignTarget(null); setRouteId(""); },
    onError: (e: Error) => alert(e.message),
  });

  const staff = data?.data ?? [];
  const attendance = attendanceRes?.data ?? [];

  return (
    <div className="animate-fade">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Staff management</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">{staff.length} agents</p>
        </div>
        {tab === "team" && (
          <Button variant="primary" onClick={() => setShowAdd(true)}><i className="ti ti-plus" /> Add staff</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-[var(--surface-2)] rounded-[10px] w-fit">
        {(["team", "attendance"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-[8px] text-[13px] font-semibold cursor-pointer border-none transition-colors capitalize ${tab === t ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "bg-transparent text-[var(--muted)]"}`}>
            {t === "team" ? "Team" : "Attendance"}
          </button>
        ))}
      </div>

      {tab === "team" && (
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
                    <div className="flex gap-2">
                      <Button onClick={() => { setEditForm({ name: s.name, phone: s.phone, role: s.role }); setEditErr(""); setEditTarget({ staffId: s.id }); }}>
                        <i className="ti ti-edit text-xs" /> Edit
                      </Button>
                      <Button onClick={() => { setAssignTarget({ staffId: s.id, name: s.name }); setRouteId(""); }}>
                        <i className="ti ti-route text-xs" /> Assign route
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "attendance" && (
        <Card>
          <table className="w-full border-collapse">
            <thead>
              <tr>{["Agent", "Date", "Check-in", "Check-out", "Duration", "Status"].map(h => (
                <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 pt-3 font-semibold">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {attLoading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-3.5 py-3.5 border-t border-[var(--border)]"><div className="h-4 bg-[var(--surface-2)] rounded animate-pulse" /></td>
                ))}</tr>
              )) : attendance.length === 0 ? (
                <tr><td colSpan={6} className="px-3.5 py-8 border-t border-[var(--border)] text-[var(--muted)] text-[13px] text-center">No attendance records today</td></tr>
              ) : attendance.map((a: any) => {
                const checkedIn = !!a.checkIn;
                const checkedOut = !!a.checkOut;
                let duration = "—";
                if (a.checkIn && a.checkOut) {
                  const mins = Math.round((new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 60000);
                  duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                } else if (a.checkIn) {
                  const mins = Math.round((Date.now() - new Date(a.checkIn).getTime()) / 60000);
                  duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                }
                const statusV = !checkedIn ? "gray" : checkedOut ? "green" : "blue";
                const statusL = !checkedIn ? "Absent" : checkedOut ? "Done" : "On duty";
                return (
                  <tr key={a.id} className="hover:bg-[var(--surface-2)]">
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--blue-soft)] text-[var(--blue-ink)] grid place-items-center text-[12px] font-semibold flex-none">
                          {initials(a.staff?.user?.name ?? "?")}
                        </div>
                        <div>
                          <div className="font-semibold text-[13.5px]">{a.staff?.user?.name ?? "—"}</div>
                          <div className="text-[11.5px] text-[var(--muted)]">{a.staff?.user?.phone ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px]">{a.date ? fmtDate(a.date) : "—"}</td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono text-[13px]">
                      {checkedIn ? fmtTime(a.checkIn) : <span className="text-[var(--muted)]">—</span>}
                      {a.checkInLat && <span className="ml-1 text-[10px] text-[var(--green-ink)]">📍</span>}
                    </td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono text-[13px]">
                      {checkedOut ? fmtTime(a.checkOut) : <span className="text-[var(--muted)]">—</span>}
                      {a.checkOutLat && <span className="ml-1 text-[10px] text-[var(--blue-ink)]">📍</span>}
                    </td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono text-[13px]">{duration}</td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      <Badge variant={statusV}>{statusL}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {editTarget && (
        <Modal title="Edit staff member" onClose={() => setEditTarget(null)} width={380}>
          <Field label="Full name"><input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus /></Field>
          <Field label="Mobile number"><input style={inputStyle} value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} /></Field>
          <Field label="Role">
            <select style={selectStyle} value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="delivery_agent">Delivery agent</option>
              <option value="manager">Manager</option>
            </select>
          </Field>
          {editErr && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{editErr}</p>}
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => {
              if (!editForm.name || editForm.phone.length !== 10) { setEditErr("Name and 10-digit phone required"); return; }
              updateStaff.mutate({ staffId: editTarget.staffId, body: editForm });
            }} disabled={updateStaff.isPending}>{updateStaff.isPending ? "Saving…" : "Save changes"}</Button>
          </div>
        </Modal>
      )}

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
