import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import type { BillingSummary, Transaction } from "@varun/shared";

const MOCK_SUMMARY: BillingSummary = {
  totalBilled: 50110, totalCollected: 43910, pendingDues: 6200,
  walletFloat: 120000, pendingCustomers: 23, successRate: 87.6,
};

const MOCK_TXN: (Transaction & { customerName: string })[] = [
  { id: "1", customerId: "c1", type: "auto_debit", method: "wallet", amount: 144, status: "success", createdAt: new Date().toISOString(), customerName: "Meera Reddy" },
  { id: "2", customerId: "c3", type: "recharge", method: "upi", amount: 1000, status: "success", createdAt: new Date().toISOString(), customerName: "Anjali Rao" },
  { id: "3", customerId: "c4", type: "debit", method: "upi", amount: 120, status: "failed", createdAt: new Date().toISOString(), customerName: "Rahul Mehta" },
  { id: "4", customerId: "c2", type: "credit", method: "cash", amount: 144, status: "pending", createdAt: new Date().toISOString(), customerName: "Vikram Singh" },
];

const methodBadge = (m: string) => {
  if (m === "wallet") return <Badge variant="blue">Wallet</Badge>;
  if (m === "upi") return <Badge variant="blue">UPI</Badge>;
  if (m === "cash") return <Badge variant="amber">Cash</Badge>;
  return <Badge variant="gray">{m}</Badge>;
};

const statusBadge = (s: string) => {
  if (s === "success") return <Badge variant="green">Success</Badge>;
  if (s === "failed") return <Badge variant="red">Failed</Badge>;
  return <Badge variant="amber">Pending sync</Badge>;
};

export default function Billing() {
  const { data: summaryRes } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: () => api.get<{ data: BillingSummary }>("/billing/summary"),
    placeholderData: { data: MOCK_SUMMARY },
  });

  const { data: txnRes } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get<{ data: (Transaction & { customerName: string })[] }>("/billing/transactions"),
    placeholderData: { data: MOCK_TXN },
  });

  const s = summaryRes?.data ?? MOCK_SUMMARY;

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Billing &amp; payments</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">UPI · Razorpay · cash collection</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button><i className="ti ti-download" /> Collection report</Button>
          <Button variant="primary"><i className="ti ti-send" /> Send reminders</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <KpiCard label="Collected today" value={fmt(s.totalCollected)} delta={`${s.successRate.toFixed(1)}% of billed`} deltaUp icon="ti-cash" iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
        <KpiCard label="Pending dues" value={fmt(s.pendingDues)} delta={`${s.pendingCustomers} customers`} icon="ti-alert-triangle" iconBg="bg-[var(--amber-soft)] text-[var(--amber-ink)]" />
        <KpiCard label="Wallet float" value={fmt(s.walletFloat)} delta="prepaid balance" icon="ti-wallet" iconBg="bg-[var(--blue-soft)] text-[var(--blue-ink)]" />
      </div>

      <Card pad>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold">Recent transactions</h3>
          <span className="text-[12px] text-[var(--blue)] font-semibold cursor-pointer">View all</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Customer", "Method", "Type", "Amount", "Status"].map((h) => (
                <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txnRes?.data.map((t) => (
              <tr key={t.id} className="hover:bg-[var(--surface-2)]">
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">{t.customerName}</td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">{methodBadge(t.method)}</td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px] text-[var(--muted)] capitalize">{t.type.replace("_", " ")}</td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">{fmt(t.amount)}</td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">{statusBadge(t.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
