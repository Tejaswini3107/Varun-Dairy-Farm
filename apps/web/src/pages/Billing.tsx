import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";

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

function currentMonthParam() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Billing() {
  const [tab, setTab] = useState<"transactions" | "customers">("transactions");
  const [month, setMonth] = useState(currentMonthParam());

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

  const sendReminders = useMutation({
    mutationFn: () => api.post("/billing/send-reminders", {}),
    onSuccess: (d: any) => alert(d.message),
    onError: (e: Error) => alert(e.message),
  });

  const s = summaryRes?.data;
  const txns = txnRes?.data ?? [];
  const custRows = custRes?.data ?? [];

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Billing &amp; payments</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">UPI · Razorpay · cash collection</p>
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
        {(["transactions", "customers"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-[8px] text-[13px] font-semibold cursor-pointer border-none transition-colors capitalize ${tab === t ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "bg-transparent text-[var(--muted)]"}`}>
            {t === "transactions" ? "Transactions" : "Customer billing"}
          </button>
        ))}
      </div>

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

      {tab === "customers" && (
        <Card pad>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold">Customer-wise billing</h3>
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-[var(--muted)]">Month</label>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="text-[13px] border border-[var(--border)] rounded-[8px] px-2.5 py-1.5 bg-[var(--surface)] text-[var(--ink)] outline-none"
              />
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
                    <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      <Badge variant="green">{r.delivered}</Badge>
                    </td>
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
    </div>
  );
}
