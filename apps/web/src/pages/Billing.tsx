import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { Modal, Field, inputStyle, selectStyle } from "@/components/ui/Modal";

const methodBadge = (m: string) => {
  if (m === "wallet") return <Badge variant="blue">Wallet</Badge>;
  if (m === "upi") return <Badge variant="blue">UPI</Badge>;
  if (m === "cash") return <Badge variant="amber">Cash</Badge>;
  return <Badge variant="gray">{m}</Badge>;
};
const statusBadge = (s: string) => {
  if (s === "success") return <Badge variant="green">Success</Badge>;
  if (s === "failed") return <Badge variant="red">Failed</Badge>;
  return <Badge variant="amber">Pending</Badge>;
};
const billStatusBadge = (s: string) => {
  if (s === "paid") return <Badge variant="green">Paid</Badge>;
  if (s === "partial") return <Badge variant="amber">Partial</Badge>;
  if (s === "unbilled") return <Badge variant="gray">Unbilled</Badge>;
  return <Badge variant="red">Unpaid</Badge>;
};

function currentMonthParam() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Billing() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"transactions" | "customers" | "monthly">("transactions");
  const [month, setMonth] = useState(currentMonthParam());
  const [billMonth, setBillMonth] = useState(currentMonthParam());
  const [collectTarget, setCollectTarget] = useState<any>(null);
  const [collectForm, setCollectForm] = useState({ amount: "", method: "cash", notes: "" });
  const [collectErr, setCollectErr] = useState("");

  const { data: summaryRes } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: () => api.get<{ data: any }>("/billing/summary"),
    refetchInterval: 5000,
  });

  const { data: txnRes } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get<{ data: any[] }>("/billing/transactions?pageSize=30"),
    refetchInterval: 5000,
    enabled: tab === "transactions",
  });

  const { data: custRes, isLoading: custLoading } = useQuery({
    queryKey: ["billing-customers", month],
    queryFn: () => api.get<{ data: any[] }>(`/billing/customers?month=${month}`),
    enabled: tab === "customers",
  });

  const { data: monthlyRes, isLoading: monthlyLoading } = useQuery({
    queryKey: ["monthly-bills", billMonth],
    queryFn: () => api.get<{ data: any[] }>(`/billing/monthly-bills?month=${billMonth}`),
    enabled: tab === "monthly",
  });

  const sendReminders = useMutation({
    mutationFn: () => api.post("/billing/send-reminders", {}),
    onSuccess: (d: any) => alert(d.message),
    onError: (e: Error) => alert(e.message),
  });

  const generateBills = useMutation({
    mutationFn: () => api.post("/billing/monthly-bills/generate", { month: billMonth }),
    onSuccess: (d: any) => { alert(d.message); qc.invalidateQueries({ queryKey: ["monthly-bills", billMonth] }); },
    onError: (e: Error) => alert(e.message),
  });

  const collectPayment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.post(`/billing/monthly-bills/${id}/collect`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-bills", billMonth] });
      setCollectTarget(null);
      setCollectForm({ amount: "", method: "cash", notes: "" });
      setCollectErr("");
    },
    onError: (e: Error) => setCollectErr(e.message),
  });

  const s = summaryRes?.data;
  const txns = txnRes?.data ?? [];
  const custRows = custRes?.data ?? [];
  const monthlyBills: any[] = monthlyRes?.data ?? [];

  const totalBilled = monthlyBills.reduce((s, b) => s + (b.totalAmount ?? 0), 0);
  const totalPaid = monthlyBills.reduce((s, b) => s + (b.paidAmount ?? 0), 0);
  const totalDue = totalBilled - totalPaid;

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Billing &amp; payments</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">UPI · Razorpay · cash collection · monthly billing</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="primary" onClick={() => sendReminders.mutate()} disabled={sendReminders.isPending}>
            <i className="ti ti-send" /> {sendReminders.isPending ? "Sending…" : "Send reminders"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <KpiCard label="Collected today" value={fmt(s?.totalCollected ?? 0)}
          delta={`${s?.successRate?.toFixed(1) ?? 0}% of billed`} deltaUp
          icon="ti-cash" iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
        <KpiCard label="Pending dues" value={fmt(s?.pendingDues ?? 0)}
          delta={`${s?.pendingCustomers ?? 0} customers`}
          icon="ti-alert-triangle" iconBg="bg-[var(--amber-soft)] text-[var(--amber-ink)]" />
        <KpiCard label="Wallet float" value={fmt(s?.walletFloat ?? 0)}
          delta="prepaid balance"
          icon="ti-wallet" iconBg="bg-[var(--blue-soft)] text-[var(--blue-ink)]" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-[var(--surface-2)] rounded-[10px] w-fit">
        {([
          { key: "transactions", label: "Transactions" },
          { key: "customers", label: "Customer billing" },
          { key: "monthly", label: "Monthly billing" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-[8px] text-[13px] font-semibold cursor-pointer border-none transition-colors ${tab === t.key ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "bg-transparent text-[var(--muted)]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Transactions ── */}
      {tab === "transactions" && (
        <Card pad>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold">Recent transactions</h3>
            <span className="text-[12px] text-[var(--muted)]">{txns.length} records</span>
          </div>
          {txns.length === 0 && (
            <p className="text-[13px] text-[var(--muted)] py-4 text-center">No transactions yet today.</p>
          )}
          <table className="w-full border-collapse">
            {txns.length > 0 && (
              <thead>
                <tr>{["Customer", "Method", "Type", "Amount", "Time", "Status"].map(h => (
                  <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 font-semibold">{h}</th>
                ))}</tr>
              </thead>
            )}
            <tbody>
              {txns.map((t: any) => (
                <tr key={t.id} className="hover:bg-[var(--surface-2)]">
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">{t.customer?.user?.name ?? "—"}</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)]">{methodBadge(t.method)}</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px] text-[var(--muted)] capitalize">{t.type?.replace("_", " ")}</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">{fmt(t.amount)}</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[12px] text-[var(--muted)]">
                    {new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)]">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Customer billing (per-delivery summary) ── */}
      {tab === "customers" && (
        <Card pad>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold">Customer-wise billing</h3>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[var(--muted)]">Month</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="text-[13px] border border-[var(--border)] rounded-[8px] px-2.5 py-1.5 bg-[var(--surface)] text-[var(--ink)] outline-none" />
            </div>
          </div>
          {custLoading ? (
            <div className="py-8 text-center text-[13px] text-[var(--muted)]">Loading…</div>
          ) : custRows.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--muted)]">No data for this month.</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>{["Customer", "Area", "Delivered", "Skipped", "Collected", "Wallet balance"].map(h => (
                  <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 font-semibold">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {custRows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-[var(--surface-2)]">
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      <div className="font-semibold text-[13.5px]">{r.name}</div>
                      <div className="text-[11.5px] text-[var(--muted)]">{r.phone}</div>
                    </td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px] text-[var(--muted)]">{r.area ?? "—"}</td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]"><Badge variant="green">{r.delivered}</Badge></td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      {r.skipped > 0 ? <Badge variant="amber">{r.skipped} skipped</Badge> : <span className="text-[var(--faint)] text-[12px]">—</span>}
                    </td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">{fmt(r.collected)}</td>
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      <span className={`font-mono text-[13px] font-semibold ${r.walletBalance < 0 ? "text-[var(--red-ink)]" : "text-[var(--green-ink)]"}`}>
                        {r.walletBalance < 0 ? "−" : "+"}{fmt(Math.abs(r.walletBalance))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="px-3.5 pt-4 pb-2 text-[12px] font-semibold text-[var(--muted)] border-t border-[var(--border)]">TOTALS</td>
                  <td className="px-3.5 pt-4 pb-2 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">
                    {custRows.reduce((s: number, r: any) => s + r.delivered, 0)}
                  </td>
                  <td className="px-3.5 pt-4 pb-2 border-t border-[var(--border)] font-mono font-semibold text-[13.5px] text-[var(--amber-ink)]">
                    {custRows.reduce((s: number, r: any) => s + r.skipped, 0)} skipped
                  </td>
                  <td className="px-3.5 pt-4 pb-2 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">
                    {fmt(custRows.reduce((s: number, r: any) => s + r.collected, 0))}
                  </td>
                  <td className="border-t border-[var(--border)]" />
                </tr>
              </tfoot>
            </table>
          )}
        </Card>
      )}

      {/* ── Monthly billing tab ── */}
      {tab === "monthly" && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
              <div className="text-[11px] text-[var(--muted)] font-semibold uppercase tracking-wider mb-1">Total billed</div>
              <div className="text-[22px] font-bold font-mono">{fmt(totalBilled)}</div>
            </div>
            <div className="bg-[var(--green-soft)] border border-[var(--border)] rounded-2xl p-4">
              <div className="text-[11px] text-[var(--green-ink)] font-semibold uppercase tracking-wider mb-1">Collected</div>
              <div className="text-[22px] font-bold font-mono text-[var(--green-ink)]">{fmt(totalPaid)}</div>
            </div>
            <div className="bg-[var(--amber-soft)] border border-[var(--border)] rounded-2xl p-4">
              <div className="text-[11px] text-[var(--amber-ink)] font-semibold uppercase tracking-wider mb-1">Outstanding</div>
              <div className="text-[22px] font-bold font-mono text-[var(--amber-ink)]">{fmt(totalDue)}</div>
            </div>
          </div>

          <Card pad>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-[15px] font-semibold">Monthly bills</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-[var(--muted)]">Month</label>
                  <input type="month" value={billMonth} onChange={e => setBillMonth(e.target.value)}
                    className="text-[13px] border border-[var(--border)] rounded-[8px] px-2.5 py-1.5 bg-[var(--surface)] text-[var(--ink)] outline-none" />
                </div>
                <Button variant="primary" onClick={() => generateBills.mutate()} disabled={generateBills.isPending}>
                  <i className="ti ti-refresh" /> {generateBills.isPending ? "Generating…" : "Generate bills"}
                </Button>
              </div>
            </div>

            {monthlyLoading ? (
              <div className="py-8 text-center text-[13px] text-[var(--muted)]">Loading…</div>
            ) : monthlyBills.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[var(--muted)]">
                No monthly billing customers found. Mark customers as "monthly" billing in their profile.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>{["Customer", "Area", "Bill amount", "Paid", "Balance due", "Status", ""].map(h => (
                    <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {monthlyBills.map((b: any) => {
                    const due = (b.totalAmount ?? 0) - (b.paidAmount ?? 0);
                    return (
                      <tr key={b.id ?? b.customerId} className="hover:bg-[var(--surface-2)]">
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                          <div className="font-semibold text-[13.5px]">{b.customer?.user?.name ?? "—"}</div>
                          <div className="text-[11.5px] text-[var(--muted)]">{b.customer?.user?.phone}</div>
                        </td>
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px] text-[var(--muted)]">
                          {b.customer?.area ?? "—"}
                        </td>
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">
                          {b.totalAmount ? fmt(b.totalAmount) : <span className="text-[var(--faint)]">—</span>}
                        </td>
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono text-[13px] text-[var(--green-ink)]">
                          {b.paidAmount > 0 ? fmt(b.paidAmount) : <span className="text-[var(--faint)]">—</span>}
                        </td>
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                          {due > 0 ? (
                            <span className="font-mono text-[13px] font-semibold text-[var(--red-ink)]">{fmt(due)}</span>
                          ) : (
                            <span className="text-[var(--faint)] text-[12px]">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                          {billStatusBadge(b.status)}
                        </td>
                        <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                          {b.id && b.status !== "paid" && (
                            <Button onClick={() => { setCollectTarget(b); setCollectForm({ amount: String(due), method: "cash", notes: "" }); setCollectErr(""); }}>
                              Collect
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="px-3.5 pt-4 pb-2 text-[12px] font-semibold text-[var(--muted)] border-t border-[var(--border)]">TOTALS</td>
                    <td className="px-3.5 pt-4 pb-2 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">{fmt(totalBilled)}</td>
                    <td className="px-3.5 pt-4 pb-2 border-t border-[var(--border)] font-mono font-semibold text-[13.5px] text-[var(--green-ink)]">{fmt(totalPaid)}</td>
                    <td className="px-3.5 pt-4 pb-2 border-t border-[var(--border)] font-mono font-semibold text-[13.5px] text-[var(--red-ink)]">{fmt(totalDue)}</td>
                    <td colSpan={2} className="border-t border-[var(--border)]" />
                  </tr>
                </tfoot>
              </table>
            )}
          </Card>
        </>
      )}

      {/* Collect payment modal */}
      {collectTarget && (
        <Modal title={`Collect payment — ${collectTarget.customer?.user?.name}`} onClose={() => setCollectTarget(null)} width={400}>
          <div className="text-[13px] text-[var(--muted)] mb-4">
            Bill: <span className="font-semibold text-[var(--ink)]">{fmt(collectTarget.totalAmount)}</span>
            {collectTarget.paidAmount > 0 && <> · Already paid: <span className="text-[var(--green-ink)] font-semibold">{fmt(collectTarget.paidAmount)}</span></>}
            {" · "}Balance: <span className="font-semibold text-[var(--red-ink)]">{fmt(collectTarget.totalAmount - collectTarget.paidAmount)}</span>
          </div>
          <Field label="Amount (₹)">
            <input style={inputStyle} type="number" min="1" value={collectForm.amount}
              onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
          </Field>
          <Field label="Payment method">
            <select style={selectStyle} value={collectForm.method} onChange={e => setCollectForm(f => ({ ...f, method: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="wallet">Wallet</option>
            </select>
          </Field>
          <Field label="Notes (optional)">
            <input style={inputStyle} value={collectForm.notes}
              onChange={e => setCollectForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. collected by Suresh" />
          </Field>
          {/* Payment history */}
          {collectTarget.payments?.length > 0 && (
            <div className="mb-3 bg-[var(--surface-2)] rounded-xl p-3">
              <div className="text-[11px] text-[var(--muted)] font-semibold mb-2 uppercase tracking-wider">Previous payments</div>
              {collectTarget.payments.map((p: any) => (
                <div key={p.id} className="flex justify-between text-[12.5px] py-1">
                  <span className="text-[var(--muted)] capitalize">{p.method}</span>
                  <span className="font-mono font-semibold">{fmt(p.amount)}</span>
                  <span className="text-[var(--faint)]">{new Date(p.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
          {collectErr && <p className="text-[var(--red)] text-[13px] mb-2">{collectErr}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setCollectTarget(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1"
              disabled={!collectForm.amount || Number(collectForm.amount) <= 0 || collectPayment.isPending}
              onClick={() => collectPayment.mutate({ id: collectTarget.id, body: { amount: Number(collectForm.amount), method: collectForm.method, notes: collectForm.notes || undefined } })}>
              {collectPayment.isPending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
