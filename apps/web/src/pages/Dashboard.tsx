import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Button } from "@/components/ui/Button";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardKPIs, RevenueDataPoint } from "@varun/shared";

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: kpisRes } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => api.get<{ data: DashboardKPIs }>("/dashboard/kpis"),
    refetchInterval: 5000,
  });

  const { data: feedRes } = useQuery({
    queryKey: ["dashboard-feed"],
    queryFn: () => api.get<{ data: { type: string; text: string; time: string; color: string }[] }>("/dashboard/feed"),
    refetchInterval: 5000,
  });

  const { data: revenueRes } = useQuery({
    queryKey: ["revenue-7d"],
    queryFn: () => api.get<{ data: RevenueDataPoint[] }>("/reports/revenue?days=7"),
    refetchInterval: 30000,
  });

  const generateOrders = useMutation({
    mutationFn: () => api.post<{ message: string; count: number }>("/orders/generate", {}),
    onSuccess: (d) => { alert(`✅ ${d.message}`); qc.invalidateQueries(); },
    onError: (e) => alert("Error: " + e.message),
  });

  const kpis = kpisRes?.data;
  const feed = feedRes?.data ?? [];
  const revenue = revenueRes?.data ?? [];

  const dotColor: Record<string, string> = { green: "var(--green)", blue: "var(--blue)", amber: "var(--amber)" };

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Good morning, Varun 👋</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {kpis?.totalRoutes ?? "—"} routes
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <LiveBadge />
          <Button variant="primary" onClick={() => generateOrders.mutate()} disabled={generateOrders.isPending}>
            <i className="ti ti-wand" /> {generateOrders.isPending ? "Generating…" : "Generate Today's Orders"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="Today's orders" value={String(kpis?.todayOrders ?? "—")}
          delta={kpis ? `${kpis.ordersChange >= 0 ? "+" : ""}${kpis.ordersChange} vs yesterday` : ""}
          deltaUp={(kpis?.ordersChange ?? 0) >= 0} icon="ti-clipboard-check" />
        <KpiCard label="Milk volume" value={`${(kpis?.milkVolumeLitres ?? 0).toLocaleString("en-IN")} L`}
          delta={`across ${kpis?.totalRoutes ?? "—"} routes`} icon="ti-bottle" />
        <KpiCard label="Collections" value={fmt(kpis?.collectionsToday ?? 0)}
          delta={`${fmt(kpis?.pendingCollections ?? 0)} pending`} icon="ti-cash"
          iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
        <KpiCard label="Active subs" value={String(kpis?.activeSubscriptions ?? "—")}
          delta={`${kpis?.renewalsDue ?? 0} renewals due`} deltaUp
          icon="ti-refresh" iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
      </div>

      <div className="grid grid-cols-[1.7fr_1fr] gap-4 mb-4">
        <Card pad>
          <CardHeader title="Revenue · last 7 days" />
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenue} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--blue)" strokeWidth={2.5} fill="url(#rg)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card pad>
          <CardHeader title="Delivery progress" />
          <div className="flex justify-center my-1">
            <svg viewBox="0 0 130 130" width={150} height={150}>
              <circle cx="65" cy="65" r="52" fill="none" stroke="var(--surface-2)" strokeWidth={13} />
              <circle cx="65" cy="65" r="52" fill="none" stroke="var(--green)" strokeWidth={13} strokeLinecap="round"
                strokeDasharray="326"
                strokeDashoffset={326 - 326 * ((kpis?.deliveryPercent ?? 0) / 100)}
                transform="rotate(-90 65 65)" />
              <text x="65" y="62" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--ink)" fontFamily="JetBrains Mono">{kpis?.deliveryPercent ?? 0}%</text>
              <text x="65" y="80" textAnchor="middle" fontSize="11" fill="var(--muted)">delivered</text>
            </svg>
          </div>
          <div className="flex justify-around text-[12.5px]">
            <span className="font-semibold text-[var(--green-ink)]">{kpis?.deliveredCount ?? 0} done</span>
            <span className="font-semibold text-[var(--amber-ink)]">{kpis?.pendingDeliveries ?? 0} pending</span>
          </div>
        </Card>
      </div>

      <Card pad>
        <CardHeader title="Live operations feed" action={<LiveBadge label="real-time" />} />
        {feed.length === 0 && (
          <p className="text-[13px] text-[var(--muted)] py-4 text-center">
            No activity yet today. Click <b>Generate Today's Orders</b> to start.
          </p>
        )}
        {feed.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-[var(--border)] last:border-0 text-[13px]">
            <span className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ background: dotColor[f.color] ?? "var(--blue)" }} />
            <span className="flex-1">{f.text}</span>
            <span className="text-[11.5px] text-[var(--faint)] whitespace-nowrap">
              {new Date(f.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
