import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import type { RevenueDataPoint } from "@varun/shared";

const MOCK_DEMAND = [
  { product: "Milk", totalQuantity: 1380, totalRevenue: 66240, category: "milk" },
  { product: "Curd", totalQuantity: 820, totalRevenue: 32800, category: "curd" },
  { product: "Ghee", totalQuantity: 214, totalRevenue: 68480, category: "ghee" },
  { product: "Paneer", totalQuantity: 380, totalRevenue: 30400, category: "paneer" },
];

const MOCK_REVENUE: RevenueDataPoint[] = [
  { date: "", label: "Fri", revenue: 38400, orders: 410 },
  { date: "", label: "Sat", revenue: 42100, orders: 440 },
  { date: "", label: "Sun", revenue: 39800, orders: 418 },
  { date: "", label: "Mon", revenue: 46200, orders: 468 },
  { date: "", label: "Tue", revenue: 44100, orders: 451 },
  { date: "", label: "Wed", revenue: 51300, orders: 490 },
  { date: "", label: "Thu", revenue: 53900, orders: 512 },
];

const catColor: Record<string, string> = {
  milk: "var(--blue)", curd: "var(--green)", ghee: "var(--amber)", paneer: "var(--blue-bright)",
};

export default function Reports() {
  const { data: demandRes } = useQuery({
    queryKey: ["product-demand"],
    queryFn: () => api.get<{ data: typeof MOCK_DEMAND }>("/reports/product-demand"),
    placeholderData: { data: MOCK_DEMAND },
  });

  const { data: revenueRes } = useQuery({
    queryKey: ["revenue-30d"],
    queryFn: () => api.get<{ data: RevenueDataPoint[] }>("/reports/revenue?days=30"),
    placeholderData: { data: MOCK_REVENUE },
  });

  const { data: retentionRes } = useQuery({
    queryKey: ["retention"],
    queryFn: () => api.get<{ data: { active: number; total: number; retained: number; churn: number } }>("/reports/retention"),
    placeholderData: { data: { active: 437, total: 465, retained: 94, churn: 6 } },
  });

  const demand = demandRes?.data ?? MOCK_DEMAND;
  const revenue = revenueRes?.data ?? MOCK_REVENUE;
  const ret = retentionRes?.data;

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Reports &amp; analytics</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Sales, demand &amp; retention</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button><i className="ti ti-calendar" /> Last 30 days</Button>
          <Button><i className="ti ti-download" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card pad>
          <CardHeader title="Product demand" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={demand} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="product" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [v.toLocaleString("en-IN"), "Units"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              {demand.map((d) => (
                <Bar key={d.category} dataKey="totalQuantity" fill={catColor[d.category] ?? "var(--blue)"} radius={[5, 5, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card pad>
          <CardHeader title="Customer retention" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenue} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Line type="monotone" dataKey="revenue" stroke="var(--green)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[12px] mt-2">
            <span className="font-semibold text-[var(--green-ink)]">↑ Retained {ret?.retained}%</span>
            <span className="text-[var(--muted)]">↓ Churn {ret?.churn}%</span>
          </div>
        </Card>
      </div>

      <Card pad>
        <CardHeader title="Revenue trend · last 7 days" />
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
            <Bar dataKey="revenue" fill="var(--blue)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
