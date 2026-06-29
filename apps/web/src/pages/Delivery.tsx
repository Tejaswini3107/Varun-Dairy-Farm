import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

type RouteOrder = {
  id: string; stopSequence: number | null; status: string;
  customerName: string; customerPhone: string; address: string;
  totalAmount: number; collectedAmount: number | null; paymentMethod: string | null;
  paymentStatus: string | null; deliveredAt: string | null;
  agentName: string | null; items: string[];
};

type Route = {
  id: string; name: string; area: string;
  agentId: string | null; agentName: string | null; agentPhone: string | null;
  customerCount: number; totalStops: number; completedStops: number;
  todayCollection: number; status: string;
};

const BLANK_ROUTE = { name: "", area: "", agentId: "" };

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--amber)",
  assigned: "var(--blue)",
  out_for_delivery: "var(--blue)",
  delivered: "var(--green)",
  failed: "var(--red)",
  cancelled: "var(--muted)",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", assigned: "Assigned",
  out_for_delivery: "On the way", delivered: "Delivered",
  failed: "Failed", cancelled: "Cancelled",
};

export default function Delivery() {
  const qc = useQueryClient();

  // Route drill-down
  const [drillRoute, setDrillRoute] = useState<Route | null>(null);
  const [overrideOrder, setOverrideOrder] = useState<RouteOrder | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideAmt, setOverrideAmt] = useState("");
  const [overrideMethod, setOverrideMethod] = useState("");

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [assignModal, setAssignModal] = useState<Route | null>(null);
  const [form, setForm] = useState({ ...BLANK_ROUTE });
  const [editForm, setEditForm] = useState({ name: "", area: "" });
  const [assignAgentId, setAssignAgentId] = useState("");
  const [err, setErr] = useState("");

  const { data: routesRes } = useQuery({
    queryKey: ["delivery-routes"],
    queryFn: () => api.get<{ data: Route[] }>("/delivery/routes"),
    refetchInterval: 5000,
  });

  const { data: staffRes } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ data: any[] }>("/staff"),
  });

  const createRoute = useMutation({
    mutationFn: (body: any) => api.post("/delivery/routes", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["delivery-routes"] }); setShowAdd(false); setForm({ ...BLANK_ROUTE }); setErr(""); },
    onError: (e: Error) => setErr(e.message),
  });

  const updateRoute = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/delivery/routes/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["delivery-routes"] }); setEditRoute(null); setErr(""); },
    onError: (e: Error) => setErr(e.message),
  });

  const deleteRoute = useMutation({
    mutationFn: (id: string) => api.del(`/delivery/routes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-routes"] }),
    onError: (e: Error) => alert(e.message),
  });

  const assignAgent = useMutation({
    mutationFn: ({ routeId, agentId }: { routeId: string; agentId: string }) =>
      api.patch(`/delivery/routes/${routeId}/assign-agent`, { agentId }),
    onSuccess: () => { qc.invalidateQueries(); setAssignModal(null); setAssignAgentId(""); setErr(""); },
    onError: (e: Error) => setErr(e.message),
  });

  const removeAgent = useMutation({
    mutationFn: (routeId: string) => api.patch(`/delivery/routes/${routeId}`, { agentId: null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery-routes"] }),
    onError: (e: Error) => alert(e.message),
  });

  const autoAssign = useMutation({
    mutationFn: () => api.post<{ message: string }>("/delivery/routes/auto-assign", {}),
    onSuccess: (d) => { alert(d.message); qc.invalidateQueries(); },
    onError: (e: Error) => alert(e.message),
  });

  const { data: drillRes, isLoading: drillLoading } = useQuery({
    queryKey: ["route-orders", drillRoute?.id],
    queryFn: () => api.get<{ data: RouteOrder[] }>(`/delivery/routes/${drillRoute!.id}/orders`),
    enabled: !!drillRoute,
    refetchInterval: 5000,
  });

  const adminOverride = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/delivery/orders/${id}/admin-status`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["route-orders"] }); qc.invalidateQueries({ queryKey: ["delivery-routes"] }); setOverrideOrder(null); },
    onError: (e: Error) => alert(e.message),
  });

  const routes = routesRes?.data ?? [];
  const staff = staffRes?.data ?? [];
  const agentsOnRoad = routes.filter(r => r.status === "in_progress").length;
  const totalCustomers = routes.reduce((s, r) => s + r.customerCount, 0);
  const routesWithAgent = routes.filter(r => r.agentId).length;

  function handleAdd() {
    if (!form.name || !form.area) { setErr("Route name and area are required"); return; }
    createRoute.mutate({ name: form.name, area: form.area, agentId: form.agentId || undefined });
  }

  function openEdit(r: Route) {
    setEditRoute(r);
    setEditForm({ name: r.name, area: r.area });
    setErr("");
  }

  function handleEdit() {
    if (!editForm.name || !editForm.area) { setErr("Name and area required"); return; }
    updateRoute.mutate({ id: editRoute!.id, ...editForm });
  }

  const statusBadge = (s: string) => {
    if (s === "completed") return <Badge variant="green"><i className="ti ti-check text-[10px]" /> Done</Badge>;
    if (s === "in_progress") return <Badge variant="blue"><i className="ti ti-truck-delivery text-[10px]" /> Live</Badge>;
    return <Badge variant="gray">Not started</Badge>;
  };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Delivery routes</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {routes.length} routes · {totalCustomers} customers · {routesWithAgent}/{routes.length} agents assigned
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <LiveBadge label={`${agentsOnRoad} on road`} />
          <Button onClick={() => autoAssign.mutate()} disabled={autoAssign.isPending}
            title="Assign each route's default agent to today's pending orders">
            <i className="ti ti-bolt" /> {autoAssign.isPending ? "Assigning…" : "Auto-assign today"}
          </Button>
          <Button variant="primary" onClick={() => { setShowAdd(true); setForm({ ...BLANK_ROUTE }); setErr(""); }}>
            <i className="ti ti-plus" /> Add route
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total routes", value: routes.length, icon: "ti-route" },
          { label: "Customers covered", value: totalCustomers, icon: "ti-users" },
          { label: "Agents assigned", value: `${routesWithAgent}/${routes.length}`, icon: "ti-user-check" },
          { label: "Agents on road", value: agentsOnRoad, icon: "ti-truck-delivery" },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--blue-soft)] text-[var(--blue-ink)] grid place-items-center flex-none">
              <i className={`ti ${k.icon} text-[17px]`} />
            </div>
            <div>
              <div className="text-[20px] font-bold leading-none">{k.value}</div>
              <div className="text-[11.5px] text-[var(--muted)] mt-0.5">{k.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Routes list */}
      {routes.length === 0 ? (
        <Card pad>
          <div className="text-center py-10 text-[var(--muted)]">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="font-semibold mb-1">No routes yet</div>
            <div className="text-[13px]">Click <b>Add route</b> to create your first delivery area.</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {routes.map(route => {
            const pct = route.totalStops > 0 ? Math.round((route.completedStops / route.totalStops) * 100) : 0;
            return (
              <Card key={route.id} className="p-4 cursor-pointer hover:border-[var(--blue)] transition-colors" onClick={() => setDrillRoute(route)}>
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[15px]">{route.name}</div>
                    <div className="text-[12.5px] text-[var(--muted)] mt-0.5">
                      <i className="ti ti-map-pin text-xs mr-1" />{route.area}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(route.status)}
                    <button onClick={e => { e.stopPropagation(); openEdit(route); }}
                      className="w-7 h-7 rounded-[7px] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] grid place-items-center cursor-pointer">
                      <i className="ti ti-edit text-xs" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); if (confirm(`Delete route "${route.name}"?`)) deleteRoute.mutate(route.id); }}
                      className="w-7 h-7 rounded-[7px] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--red-ink)] hover:border-[var(--red)] hover:bg-[var(--red-soft)] grid place-items-center cursor-pointer">
                      <i className="ti ti-trash text-xs" />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-[var(--surface-2)] rounded-[8px] p-2 text-center">
                    <div className="font-semibold text-[15px]">{route.customerCount}</div>
                    <div className="text-[10.5px] text-[var(--muted)]">customers</div>
                  </div>
                  <div className="bg-[var(--surface-2)] rounded-[8px] p-2 text-center">
                    <div className="font-semibold text-[15px]">{route.completedStops}/{route.totalStops}</div>
                    <div className="text-[10.5px] text-[var(--muted)]">today's stops</div>
                  </div>
                  <div className="bg-[var(--surface-2)] rounded-[8px] p-2 text-center">
                    <div className="font-semibold text-[15px] font-mono">{fmt(route.todayCollection)}</div>
                    <div className="text-[10.5px] text-[var(--muted)]">collected</div>
                  </div>
                </div>

                {/* Progress bar */}
                {route.totalStops > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[11.5px] text-[var(--muted)] mb-1">
                      <span>Delivery progress</span><span className="font-semibold">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? "var(--green)" : "var(--blue)" }} />
                    </div>
                  </div>
                )}

                {/* View stops hint */}
                {route.totalStops > 0 && (
                  <div className="text-[11.5px] text-[var(--blue-ink)] font-semibold mb-2 text-right">
                    <i className="ti ti-list-details mr-1" />View live stops →
                  </div>
                )}

                {/* Agent row */}
                {route.agentId ? (
                  <div className="flex items-center justify-between bg-[var(--green-soft)] rounded-[10px] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[var(--green)] text-white grid place-items-center text-[11px] font-bold flex-none">
                        {route.agentName?.charAt(0) ?? "?"}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-[var(--green-ink)]">{route.agentName}</div>
                        <div className="text-[10.5px] text-[var(--green-ink)] opacity-70">{route.agentPhone}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setAssignModal(route); setAssignAgentId(route.agentId ?? ""); setErr(""); }}
                        className="text-[11.5px] font-semibold text-[var(--green-ink)] bg-[var(--green-soft)] border border-[var(--green)] rounded-[7px] px-2 py-1 cursor-pointer hover:bg-[var(--green)] hover:text-white transition-colors">
                        Change
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeAgent.mutate(route.id); }}
                        className="text-[11.5px] font-semibold text-[var(--muted)] border border-[var(--border)] rounded-[7px] px-2 py-1 cursor-pointer hover:text-[var(--red-ink)] hover:border-[var(--red)] transition-colors bg-transparent">
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={e => { e.stopPropagation(); setAssignModal(route); setAssignAgentId(""); setErr(""); }}
                    className="w-full border border-dashed border-[var(--border-2)] rounded-[10px] py-2.5 text-[13px] font-semibold text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--blue-ink)] hover:bg-[var(--blue-soft)] transition-colors cursor-pointer bg-transparent">
                    <i className="ti ti-user-plus mr-1" /> Assign default agent
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add route modal */}
      {showAdd && (
        <Modal title="Add delivery route" onClose={() => { setShowAdd(false); setErr(""); }}>
          <Field label="Route name">
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Route A · Morning" autoFocus />
          </Field>
          <Field label="Area covered">
            <input style={inputStyle} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              placeholder="e.g. Kondapur, Madhapur" />
          </Field>
          <Field label="Default delivery agent (optional)">
            <select style={selectStyle} value={form.agentId} onChange={e => setForm(f => ({ ...f, agentId: e.target.value }))}>
              <option value="">No default agent</option>
              {staff.filter((s: any) => s.role !== "manager").map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} {s.routeName ? `· ${s.routeName}` : ""}</option>
              ))}
            </select>
          </Field>
          <p className="text-[12px] text-[var(--muted)] mb-3 mt-1">
            The default agent is auto-assigned to today's orders when you click <b>Auto-assign today</b>.
          </p>
          {err && <p className="text-[var(--red)] text-[13px] mb-2">{err}</p>}
          <div className="flex gap-2.5 mt-1">
            <Button className="flex-1" onClick={() => { setShowAdd(false); setErr(""); }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={createRoute.isPending}>
              {createRoute.isPending ? "Creating…" : "Create route"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit route modal */}
      {editRoute && (
        <Modal title={`Edit — ${editRoute.name}`} onClose={() => { setEditRoute(null); setErr(""); }}>
          <Field label="Route name">
            <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </Field>
          <Field label="Area covered">
            <input style={inputStyle} value={editForm.area} onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))} />
          </Field>
          {err && <p className="text-[var(--red)] text-[13px] mb-2">{err}</p>}
          <div className="flex gap-2.5 mt-2">
            <Button className="flex-1" onClick={() => { setEditRoute(null); setErr(""); }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEdit} disabled={updateRoute.isPending}>
              {updateRoute.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Assign agent modal */}
      {assignModal && (
        <Modal title={`Assign agent — ${assignModal.name}`} onClose={() => { setAssignModal(null); setErr(""); }} width={380}>
          <Field label="Select delivery agent">
            <select style={selectStyle} value={assignAgentId} onChange={e => setAssignAgentId(e.target.value)}>
              <option value="">Choose agent…</option>
              {staff.filter((s: any) => s.role !== "manager").map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}{s.routeName ? ` · ${s.routeName}` : ""}</option>
              ))}
            </select>
          </Field>
          <p className="text-[12px] text-[var(--muted)] mb-3">
            This sets the <b>default agent</b> for this route and assigns all today's pending orders to them immediately.
          </p>
          {err && <p className="text-[var(--red)] text-[13px] mb-2">{err}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { setAssignModal(null); setErr(""); }}>Cancel</Button>
            <Button variant="primary" className="flex-1"
              disabled={!assignAgentId || assignAgent.isPending}
              onClick={() => assignAgent.mutate({ routeId: assignModal.id, agentId: assignAgentId })}>
              {assignAgent.isPending ? "Assigning…" : "Assign & dispatch"}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Route drill-down modal ── */}
      {drillRoute && (
        <Modal title={`${drillRoute.name} · Live stops`} onClose={() => setDrillRoute(null)} width={640}>
          <div className="flex items-center gap-3 mb-4">
            <LiveBadge label="refreshing every 5s" />
            <span className="text-[13px] text-[var(--muted)]">
              {drillRoute.completedStops}/{drillRoute.totalStops} stops · {fmt(drillRoute.todayCollection)} collected
            </span>
          </div>

          {drillLoading && <p className="text-[13px] text-[var(--muted)] py-4 text-center">Loading stops…</p>}

          {!drillLoading && (drillRes?.data ?? []).length === 0 && (
            <p className="text-[13px] text-[var(--muted)] py-4 text-center">No orders generated for this route today.</p>
          )}

          <div style={{ maxHeight: 460, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {(drillRes?.data ?? []).map((o, i) => (
              <div key={o.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", background: o.status === "delivered" ? "var(--green-soft)" : o.status === "failed" ? "var(--red-soft)" : "var(--surface)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", minWidth: 22 }}>#{o.stopSequence ?? i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{o.customerName}</span>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{o.customerPhone}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, paddingLeft: 30 }}>{o.address}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", paddingLeft: 30 }}>{o.items.join(", ")}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[o.status] ?? "var(--muted)", background: "rgba(0,0,0,0.06)", borderRadius: 6, padding: "2px 8px" }}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{fmt(o.totalAmount)}</span>
                    {o.collectedAmount != null && o.collectedAmount > 0 && (
                      <span style={{ fontSize: 11, color: "var(--green-ink)" }}>
                        ₹{o.collectedAmount.toLocaleString("en-IN")} {o.paymentMethod ?? ""} ✓
                      </span>
                    )}
                    {o.deliveredAt && (
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
                        {new Date(o.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <button
                      onClick={() => { setOverrideOrder(o); setOverrideStatus(o.status); setOverrideAmt(String(o.collectedAmount ?? o.totalAmount)); setOverrideMethod(o.paymentMethod ?? "cash"); }}
                      style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-ink)", border: "1px solid var(--blue)", borderRadius: 6, padding: "2px 8px", background: "var(--blue-soft)", cursor: "pointer" }}>
                      Override
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Admin status override modal ── */}
      {overrideOrder && (
        <Modal title={`Override — ${overrideOrder.customerName}`} onClose={() => setOverrideOrder(null)} width={380}>
          <p className="text-[12.5px] text-[var(--muted)] mb-3">Manually set the delivery status for this stop.</p>
          <Field label="Status">
            <select style={{ ...({ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--ink)", fontSize: 13 }) } as React.CSSProperties}
              value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)}>
              {["pending","assigned","out_for_delivery","delivered","failed","cancelled"].map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
              ))}
            </select>
          </Field>
          {overrideStatus === "delivered" && (
            <>
              <Field label="Amount collected (₹)">
                <input type="number" style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--ink)", fontSize: 13, boxSizing: "border-box" } as React.CSSProperties}
                  value={overrideAmt} onChange={e => setOverrideAmt(e.target.value)} />
              </Field>
              <Field label="Payment method">
                <select style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--ink)", fontSize: 13 } as React.CSSProperties}
                  value={overrideMethod} onChange={e => setOverrideMethod(e.target.value)}>
                  {["cash","upi","wallet","razorpay"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </>
          )}
          <div className="flex gap-2 mt-3">
            <Button className="flex-1" onClick={() => setOverrideOrder(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={adminOverride.isPending}
              onClick={() => adminOverride.mutate({
                id: overrideOrder.id,
                status: overrideStatus,
                ...(overrideStatus === "delivered" ? { collectedAmount: parseFloat(overrideAmt) || 0, paymentMethod: overrideMethod } : {}),
              })}>
              {adminOverride.isPending ? "Saving…" : "Save override"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
