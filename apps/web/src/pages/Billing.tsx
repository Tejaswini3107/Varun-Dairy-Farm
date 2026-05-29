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

export default function Billing() {
  const { data: summaryRes } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: () => api.get<{ data: any }>("/billing/summary"),
    refetchInterval: 5000,
  });

  const { data: txnRes } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get<{ data: any[] }>("/billing/transactions?pageSize=30"),
    refetchInterval: 5000,
  });

  const sendReminders = useMutation({
    mutationFn: () => api.post("/billing/send-reminders", {}),
    onSuccess: (d: any) => alert(d.message),
    onError: (e: Error) => alert(e.message),
  });

  const s = summaryRes?.data;
  const txns = txnRes?.data ?? [];

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
    </div>
  );
}
