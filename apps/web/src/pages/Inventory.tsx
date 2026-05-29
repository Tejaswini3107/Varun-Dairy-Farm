import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

const catIcon: Record<string, string> = { milk: "ti-bottle", curd: "ti-bowl", ghee: "ti-droplet", paneer: "ti-cheese", other: "ti-package" };
const catBg: Record<string, string> = { milk: "bg-[var(--blue-soft)] text-[var(--blue-ink)]", curd: "bg-[var(--green-soft)] text-[var(--green-ink)]", ghee: "bg-[var(--amber-soft)] text-[var(--amber-ink)]", paneer: "bg-[var(--amber-soft)] text-[var(--amber-ink)]", other: "bg-[var(--surface-2)] text-[var(--muted)]" };
const statusCfg: Record<string, { v: "green" | "amber" | "red" | "gray"; label: string }> = { healthy: { v: "green", label: "Healthy" }, low: { v: "amber", label: "Low" }, critical: { v: "red", label: "Critical" }, expiring: { v: "amber", label: "Expiring" } };
const barColor = (s: string) => s === "critical" ? "var(--red)" : s === "low" || s === "expiring" ? "var(--amber)" : "var(--green)";

const PRODUCTS = [
  { id: "prod_milk", name: "Toned Milk" },
  { id: "prod_curd", name: "Curd" },
  { id: "prod_ghee", name: "Ghee 500ml" },
  { id: "prod_paneer", name: "Paneer" },
];

export default function Inventory() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ productId: "prod_milk", batchNumber: "", quantity: "", capacity: "", reorderLevel: "", expiryDate: "" });
  const [formErr, setFormErr] = useState("");
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get<{ data: any[] }>("/inventory"),
    refetchInterval: 10000,
  });

  const addStock = useMutation({
    mutationFn: (body: any) => api.post("/inventory", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setShowAdd(false); setForm({ productId: "prod_milk", batchNumber: "", quantity: "", capacity: "", reorderLevel: "", expiryDate: "" }); },
    onError: (e: Error) => setFormErr(e.message),
  });

  function handleAdd() {
    if (!form.batchNumber || !form.quantity || !form.capacity) { setFormErr("Batch number, quantity and capacity are required"); return; }
    addStock.mutate({ ...form, quantity: Number(form.quantity), capacity: Number(form.capacity), reorderLevel: Number(form.reorderLevel || 20) });
  }

  const items = data?.data ?? [];

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Inventory &amp; stock</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Live stock across products, packaging &amp; batches</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setShowAdd(true)} variant="primary"><i className="ti ti-plus" /> Purchase entry</Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="card p-8 text-center text-[var(--muted)] text-[13px]">
          No inventory records. Click <b>Purchase entry</b> to add stock.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {items.map((item: any) => {
          const cat = item.product?.category ?? "other";
          const pct = item.capacity > 0 ? Math.round((item.quantity / item.capacity) * 100) : 0;
          const sc = statusCfg[item.status] ?? { v: "gray" as const, label: item.status };
          return (
            <Card key={item.id} className="p-[17px]">
              <div className="flex items-center gap-3 mb-3.5">
                <div className={`w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[21px] ${catBg[cat]}`}>
                  <i className={`ti ${catIcon[cat] ?? "ti-package"}`} />
                </div>
                <div>
                  <div className="text-[14.5px] font-semibold">{item.product?.name ?? "—"}</div>
                  <div className="text-[11.5px] text-[var(--muted)]">Batch {item.batchNumber}</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor(item.status) }} />
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span><b className="text-[var(--ink)]">{item.quantity}</b> / {item.capacity} {item.product?.unit}</span>
                <Badge variant={sc.v}>{sc.label}</Badge>
              </div>
              {item.expiryDate && (
                <div className="mt-2 text-[11.5px] text-[var(--amber-ink)]">
                  <i className="ti ti-clock text-xs" /> Exp {new Date(item.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <Modal title="New purchase entry" onClose={() => { setShowAdd(false); setFormErr(""); }}>
          <Field label="Product">
            <select style={selectStyle} value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Batch number">
            <input style={inputStyle} value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} placeholder="e.g. B-2280" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity received">
              <input style={inputStyle} type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="500" />
            </Field>
            <Field label="Total capacity">
              <input style={inputStyle} type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="620" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reorder level">
              <input style={inputStyle} type="number" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} placeholder="100" />
            </Field>
            <Field label="Expiry date (optional)">
              <input style={inputStyle} type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </Field>
          </div>
          {formErr && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{formErr}</p>}
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={addStock.isPending}>
              {addStock.isPending ? "Adding…" : "Add stock"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
