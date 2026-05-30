import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { fmt, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from "recharts";

// ── Export utilities ──────────────────────────────────────────────────────────

function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const BOM = "﻿";
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = BOM + [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
}

function downloadExcel(sheetName: string, filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cell = (v: unknown) => {
    const type = typeof v === "number" ? "Number" : "String";
    return `<Cell><Data ss:Type="${type}">${esc(v)}</Data></Cell>`;
  };
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="H"><Font ss:Bold="1"/></Style>
  </Styles>
  <Worksheet ss:Name="${esc(sheetName)}">
    <Table>
      <Row ss:StyleID="H">${headers.map(cell).join("")}</Row>
      ${rows.map((r) => `<Row>${r.map(cell).join("")}</Row>`).join("\n")}
    </Table>
  </Worksheet>
</Workbook>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel" }));
  a.download = filename;
  a.click();
}

// ── Shared components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-[14px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function ExportBar({ onCSV, onExcel }: { onCSV: () => void; onExcel: () => void }) {
  return (
    <div className="flex items-center gap-2 mt-3 print:hidden">
      <Button onClick={onCSV}><i className="ti ti-file-type-csv" /> CSV</Button>
      <Button onClick={onExcel}><i className="ti ti-file-type-xls" /> Excel</Button>
      <Button onClick={() => window.print()}><i className="ti ti-printer" /> Print</Button>
    </div>
  );
}

function DataTable({
  headers,
  rows,
  footer,
}: {
  headers: string[];
  rows: (string | number | JSX.Element)[][];
  footer?: (string | number)[];
}) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[var(--border)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[var(--surface-2)]">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-semibold text-[var(--muted)] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-[var(--muted)]">
                No data for the selected period
              </td>
            </tr>
          ) : (
            rows.map((row, ri) => (
              <tr key={ri} className="border-t border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))
          )}
          {footer && rows.length > 0 && (
            <tr className="border-t-2 border-[var(--border-2)] bg-[var(--surface-2)] font-semibold">
              {footer.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  extras,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  extras?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4 print:hidden">
      <div>
        <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">FROM</label>
        <input
          type="date" value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="h-8 px-2.5 text-[13px] border border-[var(--border-2)] rounded-[8px] bg-[var(--surface)] text-[var(--ink)] outline-none"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">TO</label>
        <input
          type="date" value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          className="h-8 px-2.5 text-[13px] border border-[var(--border-2)] rounded-[8px] bg-[var(--surface)] text-[var(--ink)] outline-none"
        />
      </div>
      {extras}
      <div className="flex gap-2 ml-auto">
        {[
          { label: "7D", days: 7 }, { label: "30D", days: 30 },
          { label: "90D", days: 90 }, { label: "1Y", days: 365 },
        ].map(({ label, days }) => (
          <button
            key={label}
            onClick={() => {
              const from = new Date();
              from.setDate(from.getDate() - days);
              setFilters((f) => ({
                ...f,
                from: from.toISOString().split("T")[0],
                to: new Date().toISOString().split("T")[0],
              }));
            }}
            className="h-8 px-3 text-[12px] font-semibold border border-[var(--border-2)] rounded-[8px] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

type Filters = { from: string; to: string };

function defaultFilters(days = 30): Filters {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

function badge(text: string, color: string) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      {text}
    </span>
  );
}

function pctBadge(n: number) {
  if (n >= 90) return badge(`${n}%`, "bg-[var(--green-soft)] text-[var(--green-ink)]");
  if (n >= 70) return badge(`${n}%`, "bg-[var(--amber-soft)] text-[var(--amber-ink)]");
  return badge(`${n}%`, "bg-[var(--red-soft)] text-[var(--red-ink)]");
}

// ── SECTION COMPONENTS ────────────────────────────────────────────────────────

function SalesDailyReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["sales-daily", filters],
    queryFn: () => api.get<{ data: any[] }>(`/reports/sales/daily?from=${filters.from}&to=${filters.to}`),
  });
  const rows = res?.data ?? [];

  const headers = ["Date", "Orders", "Customers", "Revenue"];
  const tableRows = rows.map((r) => [
    r.date, r.orders, r.customers, fmt(r.revenue),
  ]);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);

  return (
    <Section title="Daily Sales">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="text-[12px] text-[var(--muted)] font-semibold">Total Revenue</div>
            <div className="text-[22px] font-bold mt-1">{fmt(totalRevenue)}</div>
          </div>
          <div>
            <div className="text-[12px] text-[var(--muted)] font-semibold">Total Orders</div>
            <div className="text-[22px] font-bold mt-1">{totalOrders.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <div className="text-[12px] text-[var(--muted)] font-semibold">Avg Order Value</div>
            <div className="text-[22px] font-bold mt-1">{totalOrders > 0 ? fmt(totalRevenue / totalOrders) : "—"}</div>
          </div>
        </div>
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rows} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Bar dataKey="revenue" fill="var(--blue)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4">
          {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
            <DataTable
              headers={headers}
              rows={tableRows}
              footer={["TOTAL", totalOrders, "—", fmt(totalRevenue)]}
            />
          )}
        </div>
        <ExportBar
          onCSV={() => downloadCSV("daily-sales.csv", headers, rows.map((r) => [r.date, r.orders, r.customers, r.revenue]))}
          onExcel={() => downloadExcel("Daily Sales", "daily-sales.xls", headers, rows.map((r) => [r.date, r.orders, r.customers, r.revenue]))}
        />
      </Card>
    </Section>
  );
}

function SalesMonthlyReport() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["sales-monthly"],
    queryFn: () => api.get<{ data: any[] }>("/reports/sales/monthly?months=12"),
  });
  const rows = res?.data ?? [];
  const headers = ["Month", "Orders", "Customers", "Revenue", "Avg Order Value", "Growth %"];
  const tableRows = rows.map((r) => [
    r.month, r.orders, r.customers, fmt(r.revenue),
    fmt(r.avgOrderValue),
    <span className={r.growth >= 0 ? "text-[var(--green-ink)]" : "text-[var(--red-ink)]"}>
      {r.growth >= 0 ? "+" : ""}{r.growth.toFixed(1)}%
    </span>,
  ]);

  return (
    <Section title="Monthly Sales">
      <Card pad>
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={rows} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Area type="monotone" dataKey="revenue" stroke="var(--blue)" fill="var(--blue-soft)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4">
          {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
            <DataTable headers={headers} rows={tableRows} />
          )}
        </div>
        <ExportBar
          onCSV={() => downloadCSV("monthly-sales.csv", ["Month", "Orders", "Customers", "Revenue", "Avg Order", "Growth%"], rows.map((r) => [r.month, r.orders, r.customers, r.revenue, r.avgOrderValue, r.growth.toFixed(1)]))}
          onExcel={() => downloadExcel("Monthly Sales", "monthly-sales.xls", ["Month", "Orders", "Customers", "Revenue", "Avg Order", "Growth%"], rows.map((r) => [r.month, r.orders, r.customers, r.revenue, r.avgOrderValue, r.growth.toFixed(1)]))}
        />
      </Card>
    </Section>
  );
}

function SalesProductsReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["sales-products", filters],
    queryFn: () => api.get<{ data: any[] }>(`/reports/sales/products?from=${filters.from}&to=${filters.to}`),
  });
  const rows = res?.data ?? [];
  const catColors: Record<string, string> = { milk: "var(--blue)", curd: "var(--green)", ghee: "var(--amber)", paneer: "var(--blue-bright)" };
  const headers = ["Product", "Unit", "Quantity Sold", "Revenue"];
  const tableRows = rows.map((r) => [
    <span className="font-semibold">{r.name}</span>,
    r.unit,
    r.quantity.toLocaleString("en-IN"),
    fmt(r.revenue),
  ]);

  return (
    <Section title="Product-wise Sales">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rows} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                {rows.map((r, i) => (
                  <rect key={i} fill={catColors[r.category] ?? "var(--blue)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4">
          {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
            <DataTable
              headers={headers}
              rows={tableRows}
              footer={["TOTAL", "—", "—", fmt(rows.reduce((s, r) => s + r.revenue, 0))]}
            />
          )}
        </div>
        <ExportBar
          onCSV={() => downloadCSV("product-sales.csv", ["Product", "Unit", "Quantity", "Revenue"], rows.map((r) => [r.name, r.unit, r.quantity, r.revenue]))}
          onExcel={() => downloadExcel("Product Sales", "product-sales.xls", ["Product", "Unit", "Quantity", "Revenue"], rows.map((r) => [r.name, r.unit, r.quantity, r.revenue]))}
        />
      </Card>
    </Section>
  );
}

function SalesRoutesReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["sales-routes", filters],
    queryFn: () => api.get<{ data: any[] }>(`/reports/sales/routes?from=${filters.from}&to=${filters.to}`),
  });
  const rows = res?.data ?? [];
  const headers = ["Route", "Area", "Agent", "Customers", "Orders", "Revenue", "Collected"];
  const tableRows = rows.map((r) => [
    <span className="font-semibold">{r.name}</span>,
    r.area, r.agent,
    r.totalCustomers, r.orders,
    fmt(r.revenue), fmt(r.collected),
  ]);

  return (
    <Section title="Route-wise Sales">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
          <DataTable
            headers={headers}
            rows={tableRows}
            footer={["TOTAL", "—", "—", "—", rows.reduce((s, r) => s + r.orders, 0), fmt(rows.reduce((s, r) => s + r.revenue, 0)), fmt(rows.reduce((s, r) => s + r.collected, 0))]}
          />
        )}
        <ExportBar
          onCSV={() => downloadCSV("route-sales.csv", ["Route", "Area", "Agent", "Customers", "Orders", "Revenue", "Collected"], rows.map((r) => [r.name, r.area, r.agent, r.totalCustomers, r.orders, r.revenue, r.collected]))}
          onExcel={() => downloadExcel("Route Sales", "route-sales.xls", ["Route", "Area", "Agent", "Customers", "Orders", "Revenue", "Collected"], rows.map((r) => [r.name, r.area, r.agent, r.totalCustomers, r.orders, r.revenue, r.collected]))}
        />
      </Card>
    </Section>
  );
}

function DemandForecastReport() {
  const [days, setDays] = useState(7);
  const { data: res, isLoading } = useQuery({
    queryKey: ["demand-forecast-report", days],
    queryFn: () => api.get<{ data: any[] }>(`/reports/demand/forecast?days=${days}`),
    refetchInterval: 60000,
  });
  const forecast = res?.data ?? [];

  // Flatten for export: one row per (date, product)
  const flatRows: any[] = [];
  forecast.forEach((day) => {
    day.products.forEach((p: any) => {
      flatRows.push({ date: day.label, product: p.name, unit: p.unit, qty: p.qty });
    });
  });

  const allProducts = Array.from(new Set(forecast.flatMap((d) => d.products.map((p: any) => p.name))));

  return (
    <Section title="Demand Forecast">
      <div className="flex gap-2 mb-4 print:hidden">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`h-8 px-3 text-[12px] font-semibold rounded-[8px] border transition-colors ${days === d ? "bg-[var(--blue)] text-white border-[var(--blue)]" : "bg-[var(--surface)] border-[var(--border-2)] text-[var(--muted)]"}`}
          >
            {d} Days
          </button>
        ))}
      </div>
      <Card pad>
        {isLoading ? (
          <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div>
        ) : (
          <>
            {/* Product-centric pivot view */}
            <div className="grid gap-3 mb-4">
              {allProducts.map((productName) => {
                const total = forecast.reduce((s, d) => {
                  const p = d.products.find((x: any) => x.name === productName);
                  return s + (p?.qty ?? 0);
                }, 0);
                const unit = forecast[0]?.products.find((x: any) => x.name === productName)?.unit ?? "";
                return (
                  <div key={productName} className="flex items-center gap-4 p-3 rounded-[12px] bg-[var(--surface-2)]">
                    <div className="w-28">
                      <div className="font-semibold text-[14px]">{productName}</div>
                      <div className="text-[11px] text-[var(--muted)]">{unit} · {days}d total</div>
                    </div>
                    <div className="flex-1 flex gap-2 overflow-x-auto">
                      {forecast.map((day) => {
                        const p = day.products.find((x: any) => x.name === productName);
                        return (
                          <div key={day.date} className={`flex-shrink-0 text-center px-3 py-2 rounded-[10px] min-w-[72px] ${day.isToday ? "bg-[var(--blue)] text-white" : "bg-[var(--surface)] border border-[var(--border)]"}`}>
                            <div className="text-[10px] font-semibold opacity-75">{day.label}</div>
                            <div className="text-[18px] font-bold mt-0.5">{p?.qty ?? 0}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-right min-w-[60px]">
                      <div className="text-[20px] font-bold">{total.toLocaleString("en-IN")}</div>
                      <div className="text-[11px] text-[var(--muted)]">total</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <ExportBar
          onCSV={() => downloadCSV("demand-forecast.csv", ["Date", "Product", "Unit", "Quantity"], flatRows.map((r) => [r.date, r.product, r.unit, r.qty]))}
          onExcel={() => downloadExcel("Demand Forecast", "demand-forecast.xls", ["Date", "Product", "Unit", "Quantity"], flatRows.map((r) => [r.date, r.product, r.unit, r.qty]))}
        />
      </Card>
    </Section>
  );
}

function TopCustomersReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["customers-top", filters],
    queryFn: () => api.get<{ data: any[] }>(`/reports/customers/top?from=${filters.from}&to=${filters.to}&limit=20`),
  });
  const rows = res?.data ?? [];
  const headers = ["#", "Name", "Phone", "Area", "Orders", "Revenue", "Avg Order", "Active Subs"];
  const tableRows = rows.map((r) => [
    <span className="text-[var(--muted)]">{r.rank}</span>,
    <span className="font-semibold">{r.name}</span>,
    r.phone, r.area, r.orders,
    fmt(r.revenue), fmt(r.avgOrderValue),
    r.activeSubscriptions,
  ]);

  return (
    <Section title="Top Customers by Revenue">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
          <DataTable headers={headers} rows={tableRows} />
        )}
        <ExportBar
          onCSV={() => downloadCSV("top-customers.csv", ["Rank", "Name", "Phone", "Area", "Orders", "Revenue", "Avg Order", "Active Subs"], rows.map((r) => [r.rank, r.name, r.phone, r.area, r.orders, r.revenue, r.avgOrderValue, r.activeSubscriptions]))}
          onExcel={() => downloadExcel("Top Customers", "top-customers.xls", ["Rank", "Name", "Phone", "Area", "Orders", "Revenue", "Avg Order", "Active Subs"], rows.map((r) => [r.rank, r.name, r.phone, r.area, r.orders, r.revenue, r.avgOrderValue, r.activeSubscriptions]))}
        />
      </Card>
    </Section>
  );
}

function OutstandingDuesReport() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["customers-outstanding"],
    queryFn: () => api.get<{ data: any[]; total: number }>("/reports/customers/outstanding"),
    refetchInterval: 30000,
  });
  const rows = res?.data ?? [];
  const total = res?.total ?? 0;
  const headers = ["Name", "Phone", "Area", "Orders Due", "Amount Due", "Oldest Unpaid", "Days Overdue"];
  const tableRows = rows.map((r) => [
    <span className="font-semibold">{r.name}</span>,
    r.phone, r.area, r.orderCount,
    <span className="font-semibold text-[var(--red-ink)]">{fmt(r.totalDue)}</span>,
    r.oldestDate,
    <span className={r.daysOverdue > 7 ? "text-[var(--red-ink)] font-semibold" : "text-[var(--amber-ink)]"}>
      {r.daysOverdue}d
    </span>,
  ]);

  return (
    <Section title="Outstanding Dues">
      {!isLoading && total > 0 && (
        <div className="mb-3 p-3 rounded-[12px] bg-[var(--red-soft)] border border-[var(--red)]">
          <span className="text-[var(--red-ink)] font-semibold text-[14px]">
            Total Outstanding: {fmt(total)} across {rows.length} customers
          </span>
        </div>
      )}
      <Card pad>
        {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
          <DataTable
            headers={headers}
            rows={tableRows}
            footer={["TOTAL", "—", "—", rows.reduce((s, r) => s + r.orderCount, 0), fmt(total), "—", "—"]}
          />
        )}
        <ExportBar
          onCSV={() => downloadCSV("outstanding-dues.csv", ["Name", "Phone", "Area", "Orders", "Amount Due", "Oldest Date", "Days Overdue"], rows.map((r) => [r.name, r.phone, r.area, r.orderCount, r.totalDue, r.oldestDate, r.daysOverdue]))}
          onExcel={() => downloadExcel("Outstanding Dues", "outstanding-dues.xls", ["Name", "Phone", "Area", "Orders", "Amount Due", "Oldest Date", "Days Overdue"], rows.map((r) => [r.name, r.phone, r.area, r.orderCount, r.totalDue, r.oldestDate, r.daysOverdue]))}
        />
      </Card>
    </Section>
  );
}

function CustomerGrowthReport() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["customers-growth"],
    queryFn: () => api.get<{ data: any[] }>("/reports/customers/growth?months=12"),
  });
  const rows = res?.data ?? [];
  const headers = ["Month", "New Customers", "Active", "Inactive"];
  const tableRows = rows.map((r) => [r.month, r.new, r.active, r.inactive]);

  return (
    <Section title="Customer Growth">
      <Card pad>
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={rows} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Bar dataKey="new" fill="var(--blue)" radius={[4, 4, 0, 0]} name="New" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4">
          {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
            <DataTable headers={headers} rows={tableRows} footer={["TOTAL", rows.reduce((s, r) => s + r.new, 0), rows.reduce((s, r) => s + r.active, 0), rows.reduce((s, r) => s + r.inactive, 0)]} />
          )}
        </div>
        <ExportBar
          onCSV={() => downloadCSV("customer-growth.csv", headers, rows.map((r) => [r.month, r.new, r.active, r.inactive]))}
          onExcel={() => downloadExcel("Customer Growth", "customer-growth.xls", headers, rows.map((r) => [r.month, r.new, r.active, r.inactive]))}
        />
      </Card>
    </Section>
  );
}

function DeliverySuccessReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["delivery-success", filters],
    queryFn: () => api.get<{ data: any[] }>(`/reports/delivery/success?from=${filters.from}&to=${filters.to}`),
  });
  const rows = res?.data ?? [];
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
  const totalFailed = rows.reduce((s, r) => s + r.failed, 0);
  const totalAssigned = rows.reduce((s, r) => s + r.assigned, 0);
  const overallRate = totalAssigned > 0 ? Math.round((totalDelivered / totalAssigned) * 100) : 0;
  const headers = ["Date", "Assigned", "Delivered", "Failed", "Success %", "Collected"];
  const tableRows = rows.map((r) => [
    r.date, r.assigned, r.delivered, r.failed, pctBadge(r.successRate), fmt(r.collected),
  ]);

  return (
    <Section title="Delivery Success Rate">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-[var(--border)]">
          {[
            { label: "Assigned", value: totalAssigned, color: "var(--ink)" },
            { label: "Delivered", value: totalDelivered, color: "var(--green-ink)" },
            { label: "Failed", value: totalFailed, color: "var(--red-ink)" },
            { label: "Success Rate", value: `${overallRate}%`, color: overallRate >= 90 ? "var(--green-ink)" : "var(--amber-ink)" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[12px] text-[var(--muted)] font-semibold">{s.label}</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        {rows.length > 0 && (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={rows} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Success Rate"]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
              <Line type="monotone" dataKey="successRate" stroke="var(--green)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4">
          {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
            <DataTable
              headers={headers}
              rows={tableRows}
              footer={["TOTAL", totalAssigned, totalDelivered, totalFailed, `${overallRate}%`, fmt(rows.reduce((s, r) => s + r.collected, 0))]}
            />
          )}
        </div>
        <ExportBar
          onCSV={() => downloadCSV("delivery-success.csv", ["Date", "Assigned", "Delivered", "Failed", "Success%", "Collected"], rows.map((r) => [r.date, r.assigned, r.delivered, r.failed, r.successRate, r.collected]))}
          onExcel={() => downloadExcel("Delivery Success", "delivery-success.xls", ["Date", "Assigned", "Delivered", "Failed", "Success%", "Collected"], rows.map((r) => [r.date, r.assigned, r.delivered, r.failed, r.successRate, r.collected]))}
        />
      </Card>
    </Section>
  );
}

function StaffPerformanceReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["delivery-staff", filters],
    queryFn: () => api.get<{ data: any[] }>(`/reports/delivery/staff?from=${filters.from}&to=${filters.to}`),
  });
  const rows = res?.data ?? [];
  const headers = ["Name", "Phone", "Route", "Assigned", "Delivered", "Failed", "Collected", "Success %"];
  const tableRows = rows.map((r) => [
    <span className="font-semibold">{r.name}</span>,
    r.phone, r.route, r.assigned, r.delivered, r.failed,
    fmt(r.collected), pctBadge(r.successRate),
  ]);

  return (
    <Section title="Staff Performance">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
          <DataTable
            headers={headers}
            rows={tableRows}
            footer={["TOTAL", "—", "—", rows.reduce((s, r) => s + r.assigned, 0), rows.reduce((s, r) => s + r.delivered, 0), rows.reduce((s, r) => s + r.failed, 0), fmt(rows.reduce((s, r) => s + r.collected, 0)), "—"]}
          />
        )}
        <ExportBar
          onCSV={() => downloadCSV("staff-performance.csv", ["Name", "Phone", "Route", "Assigned", "Delivered", "Failed", "Collected", "Success%"], rows.map((r) => [r.name, r.phone, r.route, r.assigned, r.delivered, r.failed, r.collected, r.successRate]))}
          onExcel={() => downloadExcel("Staff Performance", "staff-performance.xls", ["Name", "Phone", "Route", "Assigned", "Delivered", "Failed", "Collected", "Success%"], rows.map((r) => [r.name, r.phone, r.route, r.assigned, r.delivered, r.failed, r.collected, r.successRate]))}
        />
      </Card>
    </Section>
  );
}

function CollectionsReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["finance-collections", filters],
    queryFn: () => api.get<{ data: { total: number; breakdown: any[]; daily: any[] } }>(`/reports/finance/collections?from=${filters.from}&to=${filters.to}`),
  });
  const d = res?.data;
  const breakdown = d?.breakdown ?? [];
  const daily = d?.daily ?? [];
  const methodColors: Record<string, string> = { cash: "var(--green)", upi: "var(--blue)", wallet: "var(--amber)", razorpay: "var(--blue-bright)" };

  return (
    <Section title="Collections by Payment Method">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        {!isLoading && d && (
          <>
            <div className="flex items-baseline gap-3 mb-4">
              <div className="text-[28px] font-bold">{fmt(d.total)}</div>
              <div className="text-[13px] text-[var(--muted)]">total collected</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {breakdown.map((b) => (
                <div key={b.method} className="p-3 rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold capitalize">{b.method}</span>
                    <span className="text-[12px] text-[var(--muted)]">{b.percentage}%</span>
                  </div>
                  <div className="text-[20px] font-bold mt-1" style={{ color: methodColors[b.method] }}>{fmt(b.amount)}</div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[var(--border)]">
                    <div className="h-1.5 rounded-full" style={{ width: `${b.percentage}%`, background: methodColors[b.method] }} />
                  </div>
                </div>
              ))}
            </div>
            {daily.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => [fmt(v)]} contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)" }} />
                  {Object.keys(methodColors).map((m) => (
                    <Bar key={m} dataKey={m} stackId="a" fill={methodColors[m]} name={m} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
        {isLoading && <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div>}
        <ExportBar
          onCSV={() => downloadCSV("collections.csv", ["Method", "Amount", "%"], breakdown.map((b) => [b.method, b.amount, b.percentage]))}
          onExcel={() => downloadExcel("Collections", "collections.xls", ["Method", "Amount", "%"], breakdown.map((b) => [b.method, b.amount, b.percentage]))}
        />
      </Card>
    </Section>
  );
}

function SubscriptionsReport() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["subscriptions-summary"],
    queryFn: () => api.get<{ data: any }>("/reports/subscriptions/summary"),
  });
  const d = res?.data;
  const statusColors: Record<string, string> = {
    active: "bg-[var(--green-soft)] text-[var(--green-ink)]",
    paused: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
    cancelled: "bg-[var(--red-soft)] text-[var(--red-ink)]",
    vacation: "bg-[var(--blue-soft)] text-[var(--blue-ink)]",
  };
  const byProduct = d?.byProduct ?? [];

  return (
    <Section title="Subscription Summary">
      <Card pad>
        {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : d && (
          <>
            <div className="grid grid-cols-5 gap-3 mb-5">
              {["active", "paused", "vacation", "cancelled"].map((status) => (
                <div key={status} className={`p-3 rounded-[12px] text-center ${statusColors[status]}`}>
                  <div className="text-[26px] font-bold">{d.totals[status]}</div>
                  <div className="text-[11px] font-semibold capitalize mt-1">{status}</div>
                </div>
              ))}
              <div className="p-3 rounded-[12px] text-center bg-[var(--surface-2)]">
                <div className="text-[26px] font-bold">{d.totals.total}</div>
                <div className="text-[11px] font-semibold text-[var(--muted)] mt-1">TOTAL</div>
              </div>
            </div>
            <div className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Active by Product</div>
            <DataTable
              headers={["Product", "Unit", "Subscribers", "Daily Quantity"]}
              rows={byProduct.map((r: any) => [
                <span className="font-semibold">{r.name}</span>,
                r.unit,
                r.subscribers,
                r.dailyQuantity.toLocaleString("en-IN"),
              ])}
              footer={["TOTAL", "—", byProduct.reduce((s: number, r: any) => s + r.subscribers, 0), byProduct.reduce((s: number, r: any) => s + r.dailyQuantity, 0).toLocaleString("en-IN")]}
            />
          </>
        )}
        <ExportBar
          onCSV={() => downloadCSV("subscriptions.csv", ["Product", "Unit", "Subscribers", "Daily Qty"], byProduct.map((r: any) => [r.name, r.unit, r.subscribers, r.dailyQuantity]))}
          onExcel={() => downloadExcel("Subscriptions", "subscriptions.xls", ["Product", "Unit", "Subscribers", "Daily Qty"], byProduct.map((r: any) => [r.name, r.unit, r.subscribers, r.dailyQuantity]))}
        />
      </Card>
    </Section>
  );
}

function WastageReport() {
  const [filters, setFilters] = useState(defaultFilters(30));
  const { data: res, isLoading } = useQuery({
    queryKey: ["wastage", filters],
    queryFn: () => api.get<{ data: any[]; totals: any }>(`/reports/inventory/wastage?from=${filters.from}&to=${filters.to}`),
  });
  const rows = res?.data ?? [];
  const totals = res?.totals;
  const headers = ["Date", "Product", "Qty", "Unit", "Value Lost", "Reason"];
  const tableRows = rows.map((r) => [
    r.date, r.product, r.quantity, r.unit,
    <span className="text-[var(--red-ink)] font-semibold">{fmt(r.valueLost)}</span>,
    r.reason,
  ]);

  return (
    <Section title="Wastage / Spoilage Log">
      <FilterBar filters={filters} setFilters={setFilters} />
      <Card pad>
        {!isLoading && totals && rows.length > 0 && (
          <div className="flex gap-6 mb-4 pb-4 border-b border-[var(--border)]">
            <div>
              <div className="text-[12px] text-[var(--muted)] font-semibold">Total Quantity Lost</div>
              <div className="text-[20px] font-bold mt-1">{totals.quantity.toLocaleString("en-IN")}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--muted)] font-semibold">Total Value Lost</div>
              <div className="text-[20px] font-bold mt-1 text-[var(--red-ink)]">{fmt(totals.valueLost)}</div>
            </div>
          </div>
        )}
        {isLoading ? <div className="text-[var(--muted)] text-[13px] py-4 text-center">Loading…</div> : (
          <DataTable headers={headers} rows={tableRows} />
        )}
        <ExportBar
          onCSV={() => downloadCSV("wastage.csv", ["Date", "Product", "Qty", "Unit", "Value Lost", "Reason"], rows.map((r) => [r.date, r.product, r.quantity, r.unit, r.valueLost, r.reason]))}
          onExcel={() => downloadExcel("Wastage", "wastage.xls", ["Date", "Product", "Qty", "Unit", "Value Lost", "Reason"], rows.map((r) => [r.date, r.product, r.quantity, r.unit, r.valueLost, r.reason]))}
        />
      </Card>
    </Section>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

type ReportSection = "sales" | "demand" | "customers" | "delivery" | "finance" | "subscriptions" | "inventory";

const SECTIONS: { key: ReportSection; label: string; icon: string }[] = [
  { key: "sales", label: "Sales", icon: "ti-chart-bar" },
  { key: "demand", label: "Demand Forecast", icon: "ti-timeline" },
  { key: "customers", label: "Customers", icon: "ti-users" },
  { key: "delivery", label: "Delivery", icon: "ti-truck" },
  { key: "finance", label: "Finance", icon: "ti-cash" },
  { key: "subscriptions", label: "Subscriptions", icon: "ti-refresh" },
  { key: "inventory", label: "Inventory", icon: "ti-package" },
];

export default function Reports() {
  const [section, setSection] = useState<ReportSection>("sales");

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Reports &amp; Analytics</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Export to Excel, CSV, or print any report
          </p>
        </div>
        <Button onClick={() => window.print()} className="print:hidden">
          <i className="ti ti-printer" /> Print Page
        </Button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6 print:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${
              section === s.key
                ? "bg-[var(--blue)] text-white"
                : "bg-[var(--surface)] border border-[var(--border-2)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <i className={`ti ${s.icon}`} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === "sales" && (
        <>
          <SalesDailyReport />
          <SalesMonthlyReport />
          <SalesProductsReport />
          <SalesRoutesReport />
        </>
      )}

      {section === "demand" && <DemandForecastReport />}

      {section === "customers" && (
        <>
          <OutstandingDuesReport />
          <TopCustomersReport />
          <CustomerGrowthReport />
        </>
      )}

      {section === "delivery" && (
        <>
          <DeliverySuccessReport />
          <StaffPerformanceReport />
        </>
      )}

      {section === "finance" && <CollectionsReport />}

      {section === "subscriptions" && <SubscriptionsReport />}

      {section === "inventory" && <WastageReport />}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          nav, aside, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
