import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Badge } from "@/components/ui/Badge";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardKPIs, RevenueDataPoint } from "@varun/shared";

export default function Dashboard() {
  const { data: kpisRes } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: () => api.get<{ data: DashboardKPIs }>("/dashboard/kpis"),
    placeholderData: {
      data: {
        todayOrders: 462, ordersChange: 12, milkVolumeLitres: 1840,
        totalRoutes: 6, collectionsToday: 43910, pendingCollections: 6200,
        activeSubscriptions: 451, renewalsDue: 9,
        deliveredCount: 328, pendingDeliveries: 134, deliveryPercent: 71,
      }
    },
  });

  const { data: revenueRes } = useQuery({
    queryKey: ["revenue-7d"],
    queryFn: () => api.get<{ data: RevenueDataPoint[] }>("/reports/revenue?days=7"),
    placeholderData: {
      data: [
        { date: "", label: "Fri", revenue: 38400, orders: 410 },
        { date: "", label: "Sat", revenue: 42100, orders: 440 },
        { date: "", label: "Sun", revenue: 39800, orders: 418 },
        { date: "", label: "Mon", revenue: 46200, orders: 468 },
        { date: "", label: "Tue", revenue: 44100, orders: 451 },
        { date: "", label: "Wed", revenue: 51300, orders: 490 },
        { date: "", label: "Thu", revenue: 53900, orders: 512 },
      ]
    },
  });

  const kpis = kpisRes?.data;
  const revenue = revenueRes?.data ?? [];

  return (
    <div className="animate-fade">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Good morning, Varun</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Thursday, 29 May · {kpis?.totalRoutes ?? 6} routes active across Hyderabad
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <LiveBadge />
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-[13px] text-[var(--muted)]">
            <i className="ti ti-search text-sm" />
            <input
              className="bg-transparent outline-none text-[var(--ink)] font-[inherit] text-[13px] w-40"
              placeholder="Search customers, orders…"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <KpiCard label="Today's orders" value={String(kpis?.todayOrders ?? "—")} delta={`+${kpis?.ordersChange} vs yesterday`} deltaUp icon="ti-clipboard-check" />
        <KpiCard label="Milk volume" value={`${kpis?.milkVolumeLitres?.toLocaleString("en-IN") ?? "—"} L`} delta={`across ${kpis?.totalRoutes} routes`} icon="ti-bottle" />
        <KpiCard label="Collections" value={fmt(kpis?.collectionsToday ?? 0)} delta={`${fmt(kpis?.pendingCollections ?? 0)} pending`} icon="ti-cash" iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
        <KpiCard label="Active subs" value={String(kpis?.activeSubscriptions ?? "—")} delta={`${kpis?.renewalsDue} renewals due`} deltaUp icon="ti-refresh" iconBg="bg-[var(--green-soft)] text-[var(--green-ink)]" />
      </div>

      {/* Revenue chart + Delivery donut */}
      <div className="grid grid-cols-[1.7fr_1fr] gap-4 mb-4">
        <Card pad>
          <CardHeader title="Revenue · last 7 days" action={<span className="text-[12px] text-[var(--blue)] font-semibold cursor-pointer">View report</span>} />
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
                strokeDashoffset={326 - 326 * ((kpis?.deliveryPercent ?? 71) / 100)}
                transform="rotate(-90 65 65)" />
              <text x="65" y="62" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--ink)" fontFamily="JetBrains Mono">
                {kpis?.deliveryPercent ?? 71}%
              </text>
              <text x="65" y="80" textAnchor="middle" fontSize="11" fill="var(--muted)">delivered</text>
            </svg>
          </div>
          <div className="flex justify-around text-[12.5px]">
            <span className="font-semibold text-[var(--green-ink)]">{kpis?.deliveredCount ?? 328} done</span>
            <span className="font-semibold text-[var(--amber-ink)]">{kpis?.pendingDeliveries ?? 134} pending</span>
          </div>
        </Card>
      </div>

      {/* Inventory alerts + Live feed */}
      <div className="grid grid-cols-2 gap-4">
        <Card pad>
          <CardHeader title="Inventory alerts" action={<span className="text-[12px] text-[var(--blue)] font-semibold cursor-pointer">Manage stock</span>} />
          {[
            { icon: "ti-bottle", color: "var(--amber)", name: "Toned milk packets", meta: "Reorder threshold reached", badge: "200 left", bv: "amber" as const },
            { icon: "ti-droplet", color: "var(--red)", name: "Ghee tins · 500 ml", meta: "Critical — below safety stock", badge: "12 left", bv: "red" as const },
            { icon: "ti-cheese", color: "var(--amber)", name: "Paneer blocks", meta: "Expiring batch B-2241 tomorrow", badge: "low", bv: "amber" as const },
          ].map((a) => (
            <div key={a.name} className="flex items-center gap-2.5 py-2.5 border-b border-[var(--border)] last:border-0">
              <i className={`ti ${a.icon} text-xl`} style={{ color: a.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium">{a.name}</div>
                <div className="text-[11.5px] text-[var(--muted)]">{a.meta}</div>
              </div>
              <Badge variant={a.bv}>{a.badge}</Badge>
            </div>
          ))}
        </Card>

        <Card pad>
          <CardHeader title="Live operations feed" action={<LiveBadge label="real-time" />} />
          {[
            { dot: "var(--green)", text: "Sanjay completed Route 3 · stop 18", time: "2m ago" },
            { dot: "var(--blue)", text: "Meera Reddy raised milk to 3 L", time: "5m ago" },
            { dot: "var(--amber)", text: "₹450 UPI collected · Madhapur", time: "8m ago" },
            { dot: "var(--blue)", text: "Amit started Route 5 · 38 stops", time: "12m ago" },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-[var(--border)] last:border-0 text-[13px]">
              <span className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ background: f.dot }} />
              <span className="flex-1">{f.text}</span>
              <span className="text-[11.5px] text-[var(--faint)] whitespace-nowrap">{f.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
