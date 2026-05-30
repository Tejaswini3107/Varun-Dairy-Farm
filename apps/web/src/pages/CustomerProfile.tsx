import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

const FREQ_LABEL: Record<string, string> = { daily: "Daily", alternate: "Alt. day", weekly: "Weekly", monthly: "Monthly" };
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_V: Record<string, "green"|"amber"|"red"|"gray"> = { active: "green", paused: "amber", vacation: "amber", cancelled: "gray" };

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [editModal, setEditModal] = useState(false);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [addSubModal, setAddSubModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [editForm, setEditForm] = useState<any>({});
  const [subForm, setSubForm] = useState({ productId: "", quantity: "1", frequency: "daily", deliveryDays: [] as number[], startDate: "" });

  const { data: res, isLoading } = useQuery({
    queryKey: ["customer-profile", id],
    queryFn: () => api.get<{ data: any }>(`/customers/${id}/profile`),
    refetchInterval: 8000,
  });

  const { data: productsRes } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<{ data: any[] }>("/products"),
  });

  const { data: routesRes } = useQuery({
    queryKey: ["delivery-routes"],
    queryFn: () => api.get<{ data: any[] }>("/delivery/routes"),
  });

  const updateCustomer = useMutation({
    mutationFn: (body: any) => api.patch(`/customers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-profile", id] }); setEditModal(false); },
  });

  const recharge = useMutation({
    mutationFn: () => api.post(`/customers/${id}/recharge-wallet`, { amount: Number(rechargeAmount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-profile", id] }); setRechargeModal(false); setRechargeAmount(""); },
  });

  const addSub = useMutation({
    mutationFn: (body: any) => api.post(`/customers/${id}/subscriptions`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-profile", id] }); setAddSubModal(false); },
    onError: (e: Error) => alert(e.message),
  });

  const pauseSub = useMutation({
    mutationFn: ({ subId, status }: { subId: string; status: string }) =>
      api.patch(`/customers/${id}/subscriptions/${subId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-profile", id] }),
  });

  const cancelSub = useMutation({
    mutationFn: (subId: string) => api.patch(`/customers/${id}/subscriptions/${subId}`, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-profile", id] }),
  });

  if (isLoading) return <div className="animate-fade p-8 text-[var(--muted)] text-[13px]">Loading profile…</div>;

  const c = res?.data;
  if (!c) return <div className="p-8 text-[var(--muted)]">Customer not found.</div>;

  const activeSubs = c.subscriptions?.filter((s: any) => s.status !== "cancelled") ?? [];
  const products = productsRes?.data ?? [];
  const routes = routesRes?.data ?? [];

  function openEdit() {
    setEditForm({
      address: c.address, area: c.area, city: c.city ?? "", pincode: c.pincode ?? "",
      landmark: c.landmark ?? "", alternateMobile: c.alternateMobile ?? "",
      notes: c.notes ?? "", stopSequence: c.stopSequence ?? "",
    });
    setEditModal(true);
  }

  function toggleDay(d: number) {
    setSubForm(f => ({
      ...f,
      deliveryDays: f.deliveryDays.includes(d) ? f.deliveryDays.filter(x => x !== d) : [...f.deliveryDays, d],
    }));
  }

  function handleAddSub() {
    if (!subForm.productId || !subForm.quantity) return;
    addSub.mutate({
      productId: subForm.productId,
      quantity: Number(subForm.quantity),
      frequency: subForm.frequency,
      deliveryDays: subForm.deliveryDays.length ? JSON.stringify(subForm.deliveryDays) : undefined,
      startDate: subForm.startDate || undefined,
    });
  }

  return (
    <div className="animate-fade max-w-5xl">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => nav("/customers")} className="text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer bg-transparent border-0 p-0 font-[inherit]">
          <i className="ti ti-arrow-left text-lg" />
        </button>
        <div className="flex-1">
          <h2 className="text-[21px] font-semibold">{c.user?.name}</h2>
          <p className="text-[13px] text-[var(--muted)]">{c.user?.phone}{c.alternateMobile ? ` · ${c.alternateMobile}` : ""} · {c.area}{c.city ? `, ${c.city}` : ""}</p>
        </div>
        <Badge variant={c.status === "active" ? "green" : c.status === "blocked" ? "red" : "gray"}>{c.status}</Badge>
        <Button onClick={openEdit}><i className="ti ti-edit text-xs" /> Edit</Button>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Info card */}
          <Card pad>
            <CardHeader title="Customer details" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {[
                ["Route", `${c.route?.name} · ${c.route?.area}`],
                ["Stop #", c.stopSequence ?? "—"],
                ["Agent", c.route?.agent?.user?.name ?? "Not assigned"],
                ["Address", c.address],
                ["Landmark", c.landmark ?? "—"],
                ["City", `${c.city ?? "—"} ${c.pincode ? `· ${c.pincode}` : ""}`],
                ["Notes", c.notes ?? "—"],
                ["Joined", new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-[var(--faint)] text-[11px] uppercase tracking-wide">{k}</div>
                  <div className="font-medium mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Subscriptions */}
          <Card pad>
            <div className="flex items-center justify-between mb-3">
              <CardHeader title="Active subscriptions" />
              <Button onClick={() => { setSubForm({ productId: "", quantity: "1", frequency: "daily", deliveryDays: [], startDate: "" }); setAddSubModal(true); }}>
                <i className="ti ti-plus text-xs" /> Add product
              </Button>
            </div>
            {activeSubs.length === 0 && <p className="text-[13px] text-[var(--muted)]">No active subscriptions.</p>}
            {activeSubs.map((s: any) => {
              const days = s.deliveryDays ? (() => { try { return (JSON.parse(s.deliveryDays) as number[]).map(d => DAY_NAMES[d]).join(", "); } catch { return ""; } })() : "";
              return (
                <div key={s.id} className="flex items-center gap-3 py-3 border-b border-[var(--border)] last:border-0">
                  <div className="flex-1">
                    <div className="font-semibold text-[13.5px]">{s.product?.name}</div>
                    <div className="text-[12px] text-[var(--muted)] mt-0.5">
                      {s.quantity} {s.product?.unit} · {FREQ_LABEL[s.frequency]}
                      {days ? ` (${days})` : ""}
                      {s.startDate ? ` · from ${new Date(s.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                    </div>
                    <div className="text-[12px] font-mono text-[var(--blue-ink)] mt-0.5">
                      ₹{s.product?.pricePerUnit}/{s.product?.unit}
                      {s.nextDeliveryDate ? ` · next ${new Date(s.nextDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                    </div>
                  </div>
                  <Badge variant={STATUS_V[s.status] ?? "gray"}>{s.status}</Badge>
                  <button onClick={() => pauseSub.mutate({ subId: s.id, status: s.status === "paused" ? "active" : "paused" })}
                    className="text-[11.5px] font-semibold border border-[var(--border)] rounded-[7px] px-2 py-1 cursor-pointer bg-transparent text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                    {s.status === "paused" ? "▶ Resume" : "⏸ Pause"}
                  </button>
                  <button onClick={() => { if (confirm("Cancel this subscription?")) cancelSub.mutate(s.id); }}
                    className="text-[11.5px] border border-[var(--border)] rounded-[7px] px-2 py-1 cursor-pointer bg-transparent text-[var(--muted)] hover:text-[var(--red-ink)] hover:border-[var(--red)] transition-colors">
                    <i className="ti ti-x text-xs" />
                  </button>
                </div>
              );
            })}
          </Card>

          {/* Delivery history */}
          <Card pad>
            <CardHeader title="Delivery history · last 30 days" />
            <div className="flex gap-4 mb-4">
              {[
                { label: "Delivered", value: c.stats?.delivered, color: "var(--green-ink)", bg: "var(--green-soft)" },
                { label: "Failed", value: c.stats?.failed, color: "var(--red-ink)", bg: "var(--red-soft)" },
                { label: "Cancelled", value: c.stats?.cancelled, color: "var(--muted)", bg: "var(--surface-2)" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg }} className="flex-1 rounded-[10px] p-3 text-center">
                  <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value ?? 0}</div>
                  <div className="text-[11.5px]" style={{ color: s.color }}>{s.label}</div>
                </div>
              ))}
            </div>
            {(c.orders ?? []).slice(0, 10).map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0 text-[12.5px]">
                <div className="flex-1">
                  <div>{o.items?.map((i: any) => `${i.product?.name} ×${i.quantity}`).join(", ")}</div>
                  <div className="text-[var(--muted)]">{new Date(o.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
                </div>
                <span className="font-mono font-semibold">{fmt(o.totalAmount)}</span>
                <Badge variant={o.status === "delivered" ? "green" : o.status === "failed" ? "red" : "gray"} className="text-[10px]">
                  {o.status}
                </Badge>
              </div>
            ))}
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Wallet */}
          <Card pad>
            <CardHeader title="Wallet" />
            <div className={`rounded-[12px] p-4 text-center mb-3 ${c.walletBalance < 0 ? "bg-[var(--red-soft)]" : "bg-[var(--green-soft)]"}`}>
              <div className={`text-[28px] font-bold font-mono ${c.walletBalance < 0 ? "text-[var(--red-ink)]" : "text-[var(--green-ink)]"}`}>
                {c.walletBalance < 0 ? "−" : ""}₹{Math.abs(c.walletBalance).toLocaleString("en-IN")}
              </div>
              <div className="text-[12px] text-[var(--muted)] mt-1">{c.walletBalance < 0 ? "Outstanding balance" : "Available balance"}</div>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 text-center bg-[var(--surface-2)] rounded-[8px] p-2">
                <div className="font-semibold font-mono text-[14px]">{fmt(c.stats?.totalSpent ?? 0)}</div>
                <div className="text-[10.5px] text-[var(--muted)]">total spent</div>
              </div>
              <div className="flex-1 text-center bg-[var(--surface-2)] rounded-[8px] p-2">
                <div className="font-semibold text-[14px]">{c.autoPay ? "On" : "Off"}</div>
                <div className="text-[10.5px] text-[var(--muted)]">auto-pay</div>
              </div>
            </div>
            <Button className="w-full" onClick={() => setRechargeModal(true)}>
              <i className="ti ti-plus text-xs" /> Recharge wallet
            </Button>
          </Card>

          {/* Payment history */}
          <Card pad>
            <CardHeader title="Payment history" />
            {(c.transactions ?? []).slice(0, 15).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0 text-[12.5px]">
                <div>
                  <div className="font-medium capitalize">{t.type?.replace("_", " ")}</div>
                  <div className="text-[var(--muted)] text-[11px]">{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.method}</div>
                </div>
                <span className={`font-mono font-semibold ${["recharge", "credit"].includes(t.type) ? "text-[var(--green-ink)]" : "text-[var(--red-ink)]"}`}>
                  {["recharge", "credit"].includes(t.type) ? "+" : "−"}₹{t.amount.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <Modal title="Edit customer" onClose={() => setEditModal(false)}>
          {[
            { key: "address", label: "Address" }, { key: "area", label: "Area" },
            { key: "city", label: "City" }, { key: "pincode", label: "Pincode" },
            { key: "landmark", label: "Landmark" }, { key: "alternateMobile", label: "Alternate mobile" },
            { key: "stopSequence", label: "Stop sequence #" }, { key: "notes", label: "Notes" },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <input style={inputStyle} value={editForm[key] ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, [key]: e.target.value }))} />
            </Field>
          ))}
          <Field label="Status">
            <select style={selectStyle} value={editForm.status ?? c.status} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </Field>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => updateCustomer.mutate(editForm)} disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Recharge modal */}
      {rechargeModal && (
        <Modal title="Recharge wallet" onClose={() => setRechargeModal(false)} width={340}>
          <Field label="Amount (₹)">
            <input style={inputStyle} type="number" min="1" value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setRechargeModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => recharge.mutate()} disabled={!rechargeAmount || recharge.isPending}>
              {recharge.isPending ? "Adding…" : "Add funds"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Add subscription modal */}
      {addSubModal && (
        <Modal title="Add subscription" onClose={() => setAddSubModal(false)}>
          <Field label="Product">
            <select style={selectStyle} value={subForm.productId} onChange={e => setSubForm(f => ({ ...f, productId: e.target.value }))}>
              <option value="">Select product…</option>
              {products.filter((p: any) => p.isActive).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} · ₹{p.pricePerUnit}/{p.unit}</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input style={inputStyle} type="number" min="0.5" step="0.5" value={subForm.quantity} onChange={e => setSubForm(f => ({ ...f, quantity: e.target.value }))} />
          </Field>
          <Field label="Frequency">
            <select style={selectStyle} value={subForm.frequency} onChange={e => setSubForm(f => ({ ...f, frequency: e.target.value }))}>
              <option value="daily">Daily</option>
              <option value="alternate">Alternate days</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <div className="mb-3">
            <div className="text-[12px] text-[var(--muted)] mb-1.5">Custom delivery days (overrides frequency)</div>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_NAMES.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`px-2.5 py-1 rounded-[7px] text-[12px] font-semibold border cursor-pointer transition-colors ${subForm.deliveryDays.includes(i) ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "bg-transparent border-[var(--border)] text-[var(--muted)]"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Field label="Start date (optional)">
            <input style={inputStyle} type="date" value={subForm.startDate} onChange={e => setSubForm(f => ({ ...f, startDate: e.target.value }))} />
          </Field>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setAddSubModal(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAddSub} disabled={!subForm.productId || addSub.isPending}>
              {addSub.isPending ? "Adding…" : "Add subscription"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
