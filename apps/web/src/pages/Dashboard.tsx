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

  const { data: forecastRes } = useQuery({
    queryKey: ["demand-forecast"],
    queryFn: () => api.get<{ data: { productId: string; name: string; category: string; unit: string; required: number; available: number; gap: number; status: string }[]; date: string }>("/dashboard/forecast"),
    refetchInterval: 60000,
  });

  const generateOrders = useMutation({
    mutationFn: () => api.post<{ message: string; count: number }>("/orders/generate", {}),
    onSuccess: (d) => { alert(`✅ ${d.message}`); qc.invalidateQueries(); },
    onError: (e) => alert("Error: " + e.message),
  });

  const kpis = kpisRes?.data;
  const feed = feedRes?.data ?? [];
  const revenue = revenueRes?.data ?? [];
  const forecast = forecastRes?.data ?? [];
  const forecastDate = forecastRes?.date ?? "";

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

      {/* Low inventory alert banner */}
      {forecast.some(f => f.status === "critical" || f.gap < 0) && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--red)] bg-[var(--red-soft)] px-4 py-3">
          <i className="ti ti-alert-triangle text-[var(--red-ink)] text-[18px]" />
          <div className="flex-1">
            <span className="font-semibold text-[13.5px] text-[var(--red-ink)]">Stock shortage · </span>
            <span className="text-[13px] text-[var(--red-ink)]">
              {forecast.filter(f => f.status === "critical" || f.gap < 0).map(f => `${f.name} (need ${Math.abs(f.gap)} ${f.unit} more)`).join(" · ")}
            </span>
          </div>
          <a href="/inventory" className="text-[12px] font-semibold text-[var(--red-ink)] underline">View inventory →</a>
        </div>
      )}

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

      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="Total customers" value={String(kpis?.totalCustomers ?? "—")}
          delta={`${kpis?.newThisMonth ?? 0} new this month`} deltaUp
          icon="ti-users" iconBg="bg-[var(--blue-soft)] text-[var(--blue-ink)]" />
        <KpiCard label="Delivery progress" value={`${kpis?.deliveryPercent ?? 0}%`}
          delta={`${kpis?.deliveredCount ?? 0} done · ${kpis?.pendingDeliveries ?? 0} pending`}
          deltaUp={(kpis?.deliveryPercent ?? 0) >= 80} icon="ti-truck-delivery"
          iconBg="bg-[var(--amber-soft)] text-[var(--amber-ink)]" />
        <KpiCard label="Pending collections" value={fmt(kpis?.pendingCollections ?? 0)}
          delta="customers with dues" icon="ti-alert-triangle"
          iconBg="bg-[var(--red-soft)] text-[var(--red-ink)]" />
        <KpiCard label="Active routes" value={String(kpis?.totalRoutes ?? "—")}
          delta={`${kpis?.activeSubscriptions ?? 0} subscriptions`} deltaUp
          icon="ti-route" iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
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

      {forecast.length > 0 && (
        <Card pad className="mb-4">
          <CardHeader
            title={`Tomorrow's demand forecast${forecastDate ? ` · ${new Date(forecastDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`}
          />
          <div className="grid grid-cols-4 gap-3 mt-1">
            {forecast.map((f) => {
              const shortage = f.status === "shortage";
              const pct = f.required > 0 ? Math.min(100, Math.round((f.available / f.required) * 100)) : 100;
              return (
                <div key={f.productId} className="rounded-xl p-3 border border-[var(--border)]"
                  style={{ background: shortage ? "var(--red-soft)" : "var(--green-soft)" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-semibold">{f.name}</span>
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${shortage ? "bg-[var(--red)] text-white" : "bg-[var(--green)] text-white"}`}>
                      {shortage ? "Shortage" : "OK"}
                    </span>
                  </div>
                  <div className="text-[12px] text-[var(--muted)] mb-2">
                    Need <b>{f.required} {f.unit}</b> · Have {f.available} {f.unit}
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: shortage ? "var(--red)" : "var(--green)" }} />
                  </div>
                  {shortage && (
                    <div className="text-[11.5px] font-semibold mt-1.5" style={{ color: "var(--red-ink)" }}>
                      Buy {f.gap} {f.unit} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
