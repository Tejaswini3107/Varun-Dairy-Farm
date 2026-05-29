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

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", area: "", routeId: "route_3", landmark: "" });
  const [formErr, setFormErr] = useState("");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () => api.get<any>(`/customers?search=${encodeURIComponent(search)}&page=${page}&pageSize=20`),
    refetchInterval: 5000,
  });

  const addCustomer = useMutation({
    mutationFn: (body: typeof form) => api.post("/customers", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowAdd(false);
      setForm({ name: "", phone: "", address: "", area: "", routeId: "route_3", landmark: "" });
      setFormErr("");
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  function handleAdd() {
    if (!form.name || !form.phone || !form.address || !form.area) { setFormErr("All fields required"); return; }
    if (form.phone.length !== 10) { setFormErr("Enter valid 10-digit phone"); return; }
    addCustomer.mutate(form);
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
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <i className="ti ti-plus" /> Add customer
          </Button>
        </div>
      </div>

      <Card>
        <table className="w-full border-collapse">
          <thead>
            <tr>{["Customer", "Route", "Plan", "Wallet", "Status", "Actions"].map(h => (
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
              : customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)]">
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
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">{c.route?.name ?? c.routeName ?? "—"}</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px] text-[var(--muted)]">
                    {c.subscriptions?.length
                      ? c.subscriptions.map((s: any) => `${s.product?.name ?? "Item"} ×${s.quantity}`).join(", ")
                      : "No subscription"}
                  </td>
                  <td className={`px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px] ${c.walletBalance < 0 ? "text-[var(--red-ink)]" : ""}`}>
                    {fmt(c.walletBalance)}
                  </td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                    {statusBadge(c.status, c.walletBalance)}
                  </td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                    <Button onClick={() => {
                      api.post("/orders/generate-for-customer", { customerId: c.id })
                        .then(() => alert(`Order generated for ${c.user?.name ?? c.name}`))
                        .catch((e: Error) => alert(e.message));
                    }}>
                      <i className="ti ti-plus text-xs" /> Order
                    </Button>
                  </td>
                </tr>
              ))}
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

      {showAdd && (
        <Modal title="Add new customer" onClose={() => { setShowAdd(false); setFormErr(""); }}>
          <Field label="Full name">
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" autoFocus />
          </Field>
          <Field label="Mobile number">
            <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit number" />
          </Field>
          <Field label="Full address">
            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Flat / House no, Street name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area">
              <input style={inputStyle} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Kondapur" />
            </Field>
            <Field label="Landmark (optional)">
              <input style={inputStyle} value={form.landmark} onChange={e => setForm(f => ({ ...f, landmark: e.target.value }))} placeholder="Near Apollo Pharmacy" />
            </Field>
          </div>
          <Field label="Assign to route">
            <select style={selectStyle} value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}>
              {ROUTES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          {formErr && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{formErr}</p>}
          <div className="flex gap-2.5 mt-2">
            <Button className="flex-1" onClick={() => { setShowAdd(false); setFormErr(""); }}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={handleAdd} disabled={addCustomer.isPending}>
              {addCustomer.isPending ? "Adding…" : "Add customer"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
