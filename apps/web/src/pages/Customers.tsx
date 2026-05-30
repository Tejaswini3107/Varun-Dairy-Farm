import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { fmt, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

const FREQ_LABEL: Record<string, string> = { daily: "Daily", alternate: "Alt. day", weekly: "Weekly", monthly: "Monthly" };
const SUB_STATUS_VARIANT: Record<string, "green" | "amber" | "red" | "gray"> = {
  active: "green", paused: "amber", vacation: "amber", cancelled: "gray",
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BLANK = {
  name: "", phone: "", alternateMobile: "", address: "", area: "", city: "",
  pincode: "", landmark: "", notes: "", routeId: "", stopSequence: "",
};

type SubRow = { productId: string; quantity: string; frequency: string; deliveryDays: number[]; startDate: string };

export default function Customers() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Multi-step add customer
  const [addStep, setAddStep] = useState(0); // 0=hidden, 1=info, 2=subscriptions
  const [form, setForm] = useState({ ...BLANK });
  const [subRows, setSubRows] = useState<SubRow[]>([]);
  const [formErr, setFormErr] = useState("");

  // Reassign route
  const [reassignTarget, setReassignTarget] = useState<{ id: string; name: string; currentRouteId: string } | null>(null);
  const [newRouteId, setNewRouteId] = useState("");

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () => api.get<any>(`/customers?search=${encodeURIComponent(search)}&page=${page}&pageSize=20`),
    refetchInterval: 3000,
  });

  const { data: routesRes } = useQuery({
    queryKey: ["delivery-routes"],
    queryFn: () => api.get<{ data: any[] }>("/delivery/routes"),
  });

  const { data: productsRes } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<{ data: any[] }>("/products"),
  });

  const routes = routesRes?.data ?? [];
  const products = (productsRes?.data ?? []).filter((p: any) => p.isActive);

  const addCustomer = useMutation({
    mutationFn: (body: any) => api.post("/customers", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setAddStep(0); setForm({ ...BLANK }); setSubRows([]); setFormErr("");
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  const reassignRoute = useMutation({
    mutationFn: ({ customerId, routeId }: { customerId: string; routeId: string }) =>
      api.patch(`/customers/${customerId}/route`, { routeId }),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setReassignTarget(null); setNewRouteId("");
      alert(d.message + (d.ordersUpdated ? ` · ${d.ordersUpdated} order(s) updated` : ""));
    },
    onError: (e: Error) => alert(e.message),
  });

  const bulkImport = useMutation({
    mutationFn: (rows: any[]) => api.post<any>("/customers/bulk-import", { rows }),
    onSuccess: (d) => setImportResult(d),
    onError: (e: Error) => alert(e.message),
  });

  function addSubRow() {
    setSubRows(r => [...r, { productId: "", quantity: "1", frequency: "daily", deliveryDays: [], startDate: "" }]);
  }

  function updateSubRow(i: number, patch: Partial<SubRow>) {
    setSubRows(r => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  }

  function toggleDay(i: number, day: number) {
    setSubRows(r => r.map((row, idx) => idx !== i ? row : {
      ...row,
      deliveryDays: row.deliveryDays.includes(day) ? row.deliveryDays.filter(d => d !== day) : [...row.deliveryDays, day],
    }));
  }

  function handleNext() {
    if (!form.name || !form.phone || !form.routeId) { setFormErr("Name, phone and route are required"); return; }
    if (form.phone.replace(/\D/g, "").length !== 10) { setFormErr("Enter a valid 10-digit phone number"); return; }
    setFormErr(""); setAddStep(2);
  }

  function handleCreate() {
    const subs = subRows.filter(s => s.productId && Number(s.quantity) > 0).map(s => ({
      productId: s.productId,
      quantity: Number(s.quantity),
      frequency: s.frequency,
      deliveryDays: s.deliveryDays.length ? JSON.stringify(s.deliveryDays) : undefined,
      startDate: s.startDate || undefined,
    }));
    addCustomer.mutate({ ...form, phone: form.phone.replace(/\D/g, ""), stopSequence: form.stopSequence ? Number(form.stopSequence) : undefined, subscriptions: subs });
  }

  function parseCsv() {
    const lines = csvText.trim().split("\n").filter(Boolean);
    if (lines.length < 2) { alert("CSV must have a header row + at least one data row"); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim());
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
      return {
        name: obj["name"] || obj["customer name"] || "",
        phone: obj["phone"] || obj["mobile"] || "",
        address: obj["address"] || "",
        area: obj["area"] || "",
        city: obj["city"] || "",
        routeId: routes.find(r => r.name.toLowerCase().includes((obj["route"] || "").toLowerCase()))?.id || routes[0]?.id || "",
        milkQty: parseFloat(obj["milk"] || obj["milk qty"] || "0") || 0,
        curdQty: parseFloat(obj["curd"] || obj["curd qty"] || "0") || 0,
        paneerQty: parseFloat(obj["paneer"] || obj["paneer qty"] || "0") || 0,
        gheeQty: parseFloat(obj["ghee"] || obj["ghee qty"] || "0") || 0,
      };
    }).filter(r => r.name && r.phone && r.routeId);
    if (!rows.length) { alert("No valid rows found. Check that route names match."); return; }
    bulkImport.mutate(rows);
  }

  const customers = data?.data ?? [];

  const statusBadge = (status: string, wallet: number) => {
    if (wallet < 0) return <Badge variant="red"><i className="ti ti-alert-triangle text-[10px]" /> Dues</Badge>;
    if (status === "active") return <Badge variant="green"><i className="ti ti-check text-[10px]" /> Active</Badge>;
    return <Badge variant="gray">{status}</Badge>;
  };

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Customers</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">{data?.total ?? 0} total · {page}/{data?.totalPages ?? 1} pages</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] px-3 py-2">
            <i className="ti ti-search text-sm text-[var(--muted)]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent outline-none text-[var(--ink)] font-[inherit] text-[13px] w-44"
              placeholder="Search by name, phone, area…" />
          </div>
          <Button onClick={() => { setShowImport(true); setCsvText(""); setImportResult(null); }}>
            <i className="ti ti-upload text-xs" /> Import CSV
          </Button>
          <Button variant="primary" onClick={() => { setAddStep(1); setForm({ ...BLANK }); setSubRows([]); setFormErr(""); }}>
            <i className="ti ti-plus" /> Add customer
          </Button>
        </div>
      </div>

      <Card>
        <table className="w-full border-collapse">
          <thead>
            <tr>{["Customer", "Route", "Subscriptions", "Wallet", "Status", ""].map(h => (
              <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 pt-3 font-semibold">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-3.5 py-3.5 border-t border-[var(--border)]">
                    <div className="h-4 bg-[var(--surface-2)] rounded animate-pulse" />
                  </td>
                ))}</tr>
              ))
              : customers.map((c: any) => {
                const isExpanded = expandedId === c.id;
                const activeSubs = (c.subscriptions ?? []).filter((s: any) => s.status !== "cancelled");
                return (
                  <>
                    <tr key={c.id} className="hover:bg-[var(--surface-2)] cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                      <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--blue-soft)] text-[var(--blue-ink)] grid place-items-center text-[12px] font-semibold flex-none">
                            {initials(c.user?.name ?? c.name ?? "?")}
                          </div>
                          <div>
                            <div className="font-semibold text-[13.5px]">{c.user?.name ?? c.name}</div>
                            <div className="text-[11.5px] text-[var(--muted)]">{c.area} · {c.user?.phone ?? c.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px]">
                        <div>{c.route?.name ?? c.routeName ?? "—"}</div>
                        {c.stopSequence && <div className="text-[11px] text-[var(--muted)]">Stop #{c.stopSequence}</div>}
                      </td>
                      <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px]">
                        {activeSubs.length > 0
                          ? <span>{activeSubs.length} product{activeSubs.length > 1 ? "s" : ""} · <span className="text-[var(--muted)]">{activeSubs.map((s: any) => `${s.product?.name} ×${s.quantity}`).join(", ")}</span></span>
                          : <span className="text-[var(--faint)]">No subscription</span>}
                      </td>
                      <td className={`px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px] ${c.walletBalance < 0 ? "text-[var(--red-ink)]" : ""}`}>
                        {fmt(c.walletBalance)}
                      </td>
                      <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                        {statusBadge(c.status, c.walletBalance)}
                      </td>
                      <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                        <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-chevron-down"} text-[var(--muted)] text-sm`} />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${c.id}-detail`}>
                        <td colSpan={6} className="px-3.5 pb-4 border-t border-[var(--border)] bg-[var(--surface-2)]">
                          <div className="pt-3">
                            <div className="text-[11px] font-semibold text-[var(--faint)] uppercase tracking-wider mb-2">Subscription details</div>
                            {activeSubs.length === 0
                              ? <div className="text-[13px] text-[var(--muted)]">No active subscriptions.</div>
                              : (
                                <div className="grid grid-cols-3 gap-2">
                                  {activeSubs.map((s: any) => (
                                    <div key={s.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-[13px]">{s.product?.name}</span>
                                        <Badge variant={SUB_STATUS_VARIANT[s.status] ?? "gray"} className="text-[10px]">{s.status}</Badge>
                                      </div>
                                      <div className="text-[12px] text-[var(--muted)] space-y-0.5">
                                        <div>Qty: <b className="text-[var(--ink)]">{s.quantity} {s.product?.unit}</b></div>
                                        <div>Freq: <b className="text-[var(--ink)]">{FREQ_LABEL[s.frequency] ?? s.frequency}</b></div>
                                        <div>Price: <b className="text-[var(--ink)]">₹{s.product?.pricePerUnit}/{s.product?.unit}</b></div>
                                        {s.nextDeliveryDate && <div>Next: <b className="text-[var(--blue-ink)]">{new Date(s.nextDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b></div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)]">
                              <div className="text-[13px]">
                                <span className="text-[var(--muted)]">Route: </span>
                                <span className="font-semibold">{c.route?.name ?? c.routeName ?? "—"}</span>
                                {c.stopSequence && <span className="text-[var(--muted)] ml-1">· Stop #{c.stopSequence}</span>}
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={() => nav(`/customers/${c.id}`)}>
                                  <i className="ti ti-user text-xs" /> Full profile
                                </Button>
                                <Button onClick={() => { setReassignTarget({ id: c.id, name: c.user?.name ?? c.name, currentRouteId: c.routeId }); setNewRouteId(c.routeId); }}>
                                  <i className="ti ti-route text-xs" /> Change route
                                </Button>
                                <Button onClick={() => { api.post("/orders/recalculate-for-customer", { customerId: c.id }).then(() => qc.invalidateQueries()).catch((e: Error) => alert(e.message)); }}>
                                  <i className="ti ti-refresh text-xs" /> Recalculate
                                </Button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-3.5 py-3 border-t border-[var(--border)]">
          <span className="text-[12.5px] text-[var(--muted)]">{data?.total ?? 0} customers</span>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><i className="ti ti-chevron-left" /></Button>
            <span className="text-[13px] font-medium px-2">Page {page} of {data?.totalPages ?? 1}</span>
            <Button onClick={() => setPage(p => Math.min(data?.totalPages ?? 1, p + 1))} disabled={page >= (data?.totalPages ?? 1)}><i className="ti ti-chevron-right" /></Button>
          </div>
        </div>
      </Card>

      {/* ── Step 1: Customer info ── */}
      {addStep === 1 && (
        <Modal title="Add customer — Step 1 of 2: Info" onClose={() => setAddStep(0)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" autoFocus /></Field>
            <Field label="Mobile number"><input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit" /></Field>
            <Field label="Alternate number (opt.)"><input style={inputStyle} value={form.alternateMobile} onChange={e => setForm(f => ({ ...f, alternateMobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="Optional" /></Field>
            <Field label="Landmark (opt.)"><input style={inputStyle} value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} placeholder="Near Apollo Pharmacy" /></Field>
          </div>
          <Field label="Address"><input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Flat / House no, Street" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Area"><input style={inputStyle} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Kondapur" /></Field>
            <Field label="City"><input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Hyderabad" /></Field>
            <Field label="Pincode"><input style={inputStyle} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))} placeholder="500081" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Route">
              <select style={selectStyle} value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}>
                <option value="">Select route…</option>
                {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name} · {r.area}{r.agentName ? ` (${r.agentName})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Stop # (opt.)"><input style={inputStyle} type="number" value={form.stopSequence} onChange={e => setForm(f => ({ ...f, stopSequence: e.target.value }))} placeholder="e.g. 23" /></Field>
          </div>
          <Field label="Notes (opt.)"><input style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes" /></Field>
          {formErr && <p className="text-[var(--red)] text-[13px] mb-1">{formErr}</p>}
          <div className="flex gap-2.5 mt-2">
            <Button className="flex-1" onClick={() => setAddStep(0)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleNext}>Next: Add products →</Button>
          </div>
        </Modal>
      )}

      {/* ── Step 2: Subscriptions ── */}
      {addStep === 2 && (
        <Modal title="Add customer — Step 2 of 2: Subscriptions" onClose={() => setAddStep(0)}>
          <p className="text-[12.5px] text-[var(--muted)] mb-3">Add products to subscribe. You can also do this later from the customer profile.</p>
          {subRows.map((row, i) => (
            <div key={i} className="border border-[var(--border)] rounded-[10px] p-3 mb-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="Product">
                  <select style={selectStyle} value={row.productId} onChange={e => updateSubRow(i, { productId: e.target.value })}>
                    <option value="">Select…</option>
                    {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} · ₹{p.pricePerUnit}/{p.unit}</option>)}
                  </select>
                </Field>
                <Field label="Qty">
                  <input style={inputStyle} type="number" min="0.5" step="0.5" value={row.quantity} onChange={e => updateSubRow(i, { quantity: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Field label="Frequency">
                  <select style={selectStyle} value={row.frequency} onChange={e => updateSubRow(i, { frequency: e.target.value })}>
                    <option value="daily">Daily</option>
                    <option value="alternate">Alternate days</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
                <Field label="Start date (opt.)">
                  <input style={inputStyle} type="date" value={row.startDate} onChange={e => updateSubRow(i, { startDate: e.target.value })} />
                </Field>
              </div>
              <div className="mb-1">
                <div className="text-[11.5px] text-[var(--muted)] mb-1">Custom days (optional — overrides frequency)</div>
                <div className="flex gap-1">
                  {DAY_NAMES.map((d, di) => (
                    <button key={di} onClick={() => toggleDay(i, di)}
                      className={`px-2 py-0.5 rounded-[6px] text-[11.5px] font-semibold border cursor-pointer transition-colors ${row.deliveryDays.includes(di) ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "bg-transparent border-[var(--border)] text-[var(--muted)]"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setSubRows(r => r.filter((_, idx) => idx !== i))} className="text-[11px] text-[var(--red-ink)] cursor-pointer bg-transparent border-0 mt-1 p-0 font-[inherit]">Remove</button>
            </div>
          ))}
          <button onClick={addSubRow} className="w-full border border-dashed border-[var(--border-2)] rounded-[10px] py-2 text-[13px] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--blue)] cursor-pointer bg-transparent mb-3">
            <i className="ti ti-plus mr-1" /> Add product
          </button>
          {formErr && <p className="text-[var(--red)] text-[13px] mb-1">{formErr}</p>}
          <div className="flex gap-2.5">
            <Button className="flex-1" onClick={() => setAddStep(1)}>← Back</Button>
            <Button variant="primary" className="flex-1" onClick={handleCreate} disabled={addCustomer.isPending}>
              {addCustomer.isPending ? "Creating…" : "Create customer"}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Reassign route modal ── */}
      {reassignTarget && (
        <Modal title={`Change route — ${reassignTarget.name}`} onClose={() => setReassignTarget(null)} width={400}>
          <Field label="Assign to route">
            <select style={selectStyle} value={newRouteId} onChange={e => setNewRouteId(e.target.value)}>
              <option value="">Select route…</option>
              {routes.map((r: any) => (
                <option key={r.id} value={r.id}>{r.id === reassignTarget.currentRouteId ? "✓ " : ""}{r.name} · {r.area}{r.agentName ? ` (${r.agentName})` : " (no agent)"}</option>
              ))}
            </select>
          </Field>
          <p className="text-[12px] text-[var(--muted)] mt-1 mb-3">Today's pending orders will be moved to the new route and re-assigned to that route's default agent.</p>
          <div className="flex gap-2.5">
            <Button className="flex-1" onClick={() => setReassignTarget(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1"
              disabled={!newRouteId || newRouteId === reassignTarget.currentRouteId || reassignRoute.isPending}
              onClick={() => reassignRoute.mutate({ customerId: reassignTarget.id, routeId: newRouteId })}>
              {reassignRoute.isPending ? "Moving…" : "Move to route"}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Bulk CSV import ── */}
      {showImport && (
        <Modal title="Bulk import customers" onClose={() => setShowImport(false)}>
          {!importResult ? (
            <>
              <p className="text-[12.5px] text-[var(--muted)] mb-2">
                Paste CSV with headers: <code className="bg-[var(--surface-2)] px-1 rounded text-[11px]">name, phone, address, area, city, route, milk, curd, paneer, ghee</code>
              </p>
              <p className="text-[11.5px] text-[var(--muted)] mb-3">Route column should match route names (partial match). Qty columns are optional.</p>
              <textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                rows={10}
                placeholder={"name,phone,address,area,route,milk,curd\nPriya Sharma,9876543210,Flat 12 Green Park,Kondapur,Route A,2,1\nRaj Kumar,9876543211,HNo 45 Madhapur,Madhapur,Route B,3,0"}
                style={{ width: "100%", fontFamily: "monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid var(--border-2)", background: "var(--surface)", color: "var(--ink)", resize: "vertical", boxSizing: "border-box" }}
              />
              <div className="flex gap-2 mt-3">
                <Button className="flex-1" onClick={() => setShowImport(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" onClick={parseCsv} disabled={!csvText.trim() || bulkImport.isPending}>
                  {bulkImport.isPending ? "Importing…" : "Import"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className={`rounded-[10px] p-4 mb-3 ${importResult.created > 0 ? "bg-[var(--green-soft)]" : "bg-[var(--surface-2)]"}`}>
                <div className="font-semibold text-[14px] mb-1">Import complete</div>
                <div className="text-[13px]">✅ Created: <b>{importResult.created}</b> · ⏭ Skipped: <b>{importResult.skipped}</b></div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="bg-[var(--red-soft)] rounded-[10px] p-3 mb-3">
                  <div className="text-[12px] font-semibold text-[var(--red-ink)] mb-1">Errors</div>
                  {importResult.errors.map((e: string, i: number) => <div key={i} className="text-[11.5px] text-[var(--red-ink)]">{e}</div>)}
                </div>
              )}
              <Button variant="primary" className="w-full" onClick={() => { setShowImport(false); qc.invalidateQueries({ queryKey: ["customers"] }); }}>Done</Button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
