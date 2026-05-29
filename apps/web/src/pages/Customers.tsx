import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { fmt, initials, fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Customer, PaginatedResponse } from "@varun/shared";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () =>
      api.get<PaginatedResponse<Customer & { name: string; phone: string; routeName: string }>>(
        `/customers?search=${search}&page=${page}&pageSize=20`
      ),
    placeholderData: {
      data: [
        { id: "1", name: "Meera Reddy", phone: "98xxxxxx12", address: "Kondapur", area: "Kondapur", routeId: "r3", routeName: "Route 3", walletBalance: 676, autoPay: true, status: "active", subscriptions: [], createdAt: "", updatedAt: "" },
        { id: "2", name: "Vikram Singh", phone: "99xxxxxx04", address: "Kondapur", area: "Kondapur", routeId: "r3", routeName: "Route 3", walletBalance: 240, autoPay: true, status: "active", subscriptions: [], createdAt: "", updatedAt: "" },
        { id: "3", name: "Anjali Rao", phone: "97xxxxxx88", address: "Gachibowli", area: "Gachibowli", routeId: "r5", routeName: "Route 5", walletBalance: 1120, autoPay: true, status: "active", subscriptions: [], createdAt: "", updatedAt: "" },
        { id: "4", name: "Rahul Mehta", phone: "96xxxxxx51", address: "Madhapur", area: "Madhapur", routeId: "r2", routeName: "Route 2", walletBalance: -120, autoPay: false, status: "active", subscriptions: [], createdAt: "", updatedAt: "" },
        { id: "5", name: "Kavya Patel", phone: "90xxxxxx33", address: "Jubilee Hills", area: "Jubilee Hills", routeId: "r1", routeName: "Route 1", walletBalance: 540, autoPay: true, status: "active", subscriptions: [], createdAt: "", updatedAt: "" },
      ],
      total: 451, page: 1, pageSize: 20, totalPages: 23,
    },
  });

  const statusBadge = (s: string, wallet: number) => {
    if (wallet < 0) return <Badge variant="red"><i className="ti ti-alert-triangle text-[10px]" /> Dues</Badge>;
    if (s === "active") return <Badge variant="green"><i className="ti ti-check text-[10px]" /> Active</Badge>;
    if (s === "inactive") return <Badge variant="gray">Inactive</Badge>;
    return <Badge variant="amber">{s}</Badge>;
  };

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Customers</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">451 active subscriptions · 6 routes</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-[13px] text-[var(--muted)]">
            <i className="ti ti-search text-sm" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent outline-none text-[var(--ink)] font-[inherit] text-[13px] w-44"
              placeholder="Search by name or phone…"
            />
          </div>
          <Button variant="primary"><i className="ti ti-plus" /> Add customer</Button>
        </div>
      </div>

      <Card>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Customer", "Route", "Plan", "Wallet", "Today", "Status"].map((h) => (
                <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 pt-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-3.5 py-3.5 border-t border-[var(--border)]">
                      <div className="h-4 bg-[var(--surface-2)] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
              : data?.data.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)] cursor-pointer">
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--blue-soft)] text-[var(--blue-ink)] grid place-items-center text-[12px] font-semibold flex-none">
                        {initials(c.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-[13.5px]">{c.name}</div>
                        <div className="text-[11.5px] text-[var(--muted)]">{c.area} · {c.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">{c.routeName}</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">Milk 3 L · daily</td>
                  <td className={`px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px] ${c.walletBalance < 0 ? "text-[var(--red-ink)]" : ""}`}>
                    {fmt(c.walletBalance)}
                  </td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13px] text-[var(--muted)]">Milk ×3, Curd ×1</td>
                  <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                    {statusBadge(c.status, c.walletBalance)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3.5 py-3 border-t border-[var(--border)]">
          <span className="text-[12.5px] text-[var(--muted)]">
            {data?.total ?? 0} total customers
          </span>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
              <i className="ti ti-chevron-left" />
            </Button>
            <span className="text-[13px] font-medium px-2">Page {page} of {data?.totalPages ?? 1}</span>
            <Button onClick={() => setPage(Math.min(data?.totalPages ?? 1, page + 1))} disabled={page === (data?.totalPages ?? 1)}>
              <i className="ti ti-chevron-right" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
