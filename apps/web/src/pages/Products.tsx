import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

const CATEGORIES = ["milk", "curd", "ghee", "paneer", "other"] as const;
type Category = typeof CATEGORIES[number];

const CAT_ICON: Record<Category, string> = {
  milk: "🥛", curd: "🥣", ghee: "🫙", paneer: "🧀", other: "📦",
};
const CAT_COLOR: Record<Category, string> = {
  milk: "bg-[var(--blue-soft)] text-[var(--blue-ink)]",
  curd: "bg-[var(--green-soft)] text-[var(--green-ink)]",
  ghee: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
  paneer: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
  other: "bg-[var(--surface-2)] text-[var(--muted)]",
};

const BLANK = { name: "", category: "milk" as Category, unit: "L", pricePerUnit: "", description: "" };

export default function Products() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [editForm, setEditForm] = useState({ name: "", unit: "", pricePerUnit: "", description: "" });
  const [err, setErr] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get<{ data: any[] }>("/products"),
    refetchInterval: 10000,
  });

  const addProduct = useMutation({
    mutationFn: (body: any) => api.post("/products", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setShowAdd(false); setForm({ ...BLANK }); setErr(""); },
    onError: (e: Error) => setErr(e.message),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/products/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setEditing(null); setErr(""); },
    onError: (e: Error) => setErr(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.del(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (e: Error) => alert(e.message),
  });

  function openEdit(p: any) {
    setEditing(p);
    setEditForm({ name: p.name, unit: p.unit, pricePerUnit: String(p.pricePerUnit), description: p.description ?? "" });
    setErr("");
  }

  function handleAdd() {
    if (!form.name || !form.unit || !form.pricePerUnit) { setErr("Name, unit, and price are required"); return; }
    addProduct.mutate({ ...form, pricePerUnit: Number(form.pricePerUnit) });
  }

  function handleEdit() {
    if (!editForm.name || !editForm.unit || !editForm.pricePerUnit) { setErr("Name, unit, and price are required"); return; }
    updateProduct.mutate({ id: editing.id, ...editForm, pricePerUnit: Number(editForm.pricePerUnit) });
  }

  const products = data?.data ?? [];
  const active = products.filter((p: any) => p.isActive);
  const inactive = products.filter((p: any) => !p.isActive);

  const UNIT_SUGGESTIONS = ["L", "kg", "g", "packet", "cup", "piece", "500ml", "250g"];

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Products</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">{active.length} active · {inactive.length} inactive</p>
        </div>
        <Button variant="primary" onClick={() => { setShowAdd(true); setErr(""); }}>
          <i className="ti ti-plus" /> Add product
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-[var(--surface-2)] rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {active.map((p: any) => (
              <Card key={p.id} className="p-[17px]">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px] flex-none ${CAT_COLOR[p.category as Category] ?? CAT_COLOR.other}`}>
                    {CAT_ICON[p.category as Category] ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px] leading-snug">{p.name}</div>
                    <div className="text-[11.5px] text-[var(--muted)] capitalize mt-0.5">{p.category}</div>
                  </div>
                  <Badge variant="green" className="text-[10px] flex-none">Active</Badge>
                </div>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <div className="text-[22px] font-bold font-mono leading-none">₹{p.pricePerUnit}</div>
                    <div className="text-[11.5px] text-[var(--muted)] mt-0.5">per {p.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[18px] font-semibold">{p._count?.subscriptions ?? 0}</div>
                    <div className="text-[11px] text-[var(--muted)]">subscribers</div>
                  </div>
                </div>

                {p.description && (
                  <div className="text-[12px] text-[var(--muted)] mb-3 truncate">{p.description}</div>
                )}

                <div className="flex gap-2">
                  <Button className="flex-1 text-[12px]" onClick={() => openEdit(p)}>
                    <i className="ti ti-edit text-xs" /> Edit
                  </Button>
                  <button
                    onClick={() => { if (confirm(`Deactivate "${p.name}"?`)) deactivate.mutate(p.id); }}
                    className="px-3 py-1.5 rounded-[8px] border border-[var(--border)] text-[12px] text-[var(--muted)] hover:text-[var(--red-ink)] hover:border-[var(--red)] hover:bg-[var(--red-soft)] transition-colors cursor-pointer bg-transparent font-[inherit]">
                    <i className="ti ti-trash text-xs" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {inactive.length > 0 && (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)] mb-3">Inactive products</div>
              <div className="grid grid-cols-3 gap-4">
                {inactive.map((p: any) => (
                  <Card key={p.id} className="p-[17px] opacity-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center text-[20px] ${CAT_COLOR[p.category as Category] ?? CAT_COLOR.other}`}>
                        {CAT_ICON[p.category as Category] ?? "📦"}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[13.5px]">{p.name}</div>
                        <div className="text-[12px] text-[var(--muted)]">₹{p.pricePerUnit}/{p.unit}</div>
                      </div>
                      <Button className="text-[12px]" onClick={() => updateProduct.mutate({ id: p.id, isActive: true })}>
                        Restore
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add product modal */}
      {showAdd && (
        <Modal title="Add product" onClose={() => { setShowAdd(false); setErr(""); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product name">
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Full Cream Milk" autoFocus />
            </Field>
            <Field label="Category">
              <select style={selectStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <input style={inputStyle} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="L / kg / packet" list="unit-suggestions" />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
              </datalist>
            </Field>
            <Field label="Price per unit (₹)">
              <input style={inputStyle} type="number" min="0" step="0.5" value={form.pricePerUnit}
                onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))}
                placeholder="e.g. 48" />
            </Field>
            <Field label="Description (optional)">
              <input style={inputStyle} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description for customers" />
            </Field>
          </div>
          {err && <p className="text-[var(--red)] text-[13px] mb-2">{err}</p>}
          <div className="flex gap-2.5 mt-2">
            <Button className="flex-1" onClick={() => { setShowAdd(false); setErr(""); }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={addProduct.isPending}>
              {addProduct.isPending ? "Adding…" : "Add product"}
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit product modal */}
      {editing && (
        <Modal title={`Edit — ${editing.name}`} onClose={() => { setEditing(null); setErr(""); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Product name">
              <input style={inputStyle} value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </Field>
            <Field label="Unit">
              <input style={inputStyle} value={editForm.unit}
                onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                list="unit-suggestions-edit" />
              <datalist id="unit-suggestions-edit">
                {UNIT_SUGGESTIONS.map(u => <option key={u} value={u} />)}
              </datalist>
            </Field>
            <Field label="Price per unit (₹)">
              <input style={inputStyle} type="number" min="0" step="0.5" value={editForm.pricePerUnit}
                onChange={e => setEditForm(f => ({ ...f, pricePerUnit: e.target.value }))} />
            </Field>
            <Field label="Description (optional)">
              <input style={inputStyle} value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
          </div>
          {err && <p className="text-[var(--red)] text-[13px] mb-2">{err}</p>}
          <div className="flex gap-2.5 mt-2">
            <Button className="flex-1" onClick={() => { setEditing(null); setErr(""); }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleEdit} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
