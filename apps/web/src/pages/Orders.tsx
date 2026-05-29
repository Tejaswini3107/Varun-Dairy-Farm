import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LiveBadge } from "@/components/ui/LiveBadge";
import type { Order } from "@varun/shared";

type GroupedOrders = { pending: Order[]; assigned: Order[]; out_for_delivery: Order[]; delivered: Order[]; failed: Order[] };

const MOCK: GroupedOrders = {
  pending: [
    { id: "1", customerId: "c1", routeId: "r3", status: "pending", totalAmount: 96, date: "", createdAt: "", updatedAt: "", items: [{ id: "i1", orderId: "1", productId: "p1", quantity: 2, unitPrice: 48, totalPrice: 96 }], customer: { id: "c1", name: "Priya Sharma", address: "Lotus Apts, Kondapur" } as any },
    { id: "2", customerId: "c2", routeId: "r6", status: "pending", totalAmount: 48, date: "", createdAt: "", updatedAt: "", items: [], customer: { id: "c2", name: "Imran Khan", address: "Hi-Tech City" } as any },
  ],
  assigned: [
    { id: "3", customerId: "c3", routeId: "r3", status: "assigned", totalAmount: 144, date: "", createdAt: "", updatedAt: "", items: [], deliveryAgent: { id: "s1", name: "Sanjay" } as any, customer: { id: "c3", name: "Meera Reddy", address: "Route 3" } as any },
  ],
  out_for_delivery: [
    { id: "4", customerId: "c4", routeId: "r5", status: "out_for_delivery", totalAmount: 80, date: "", createdAt: "", updatedAt: "", items: [], deliveryAgent: { id: "s2", name: "Amit" } as any, customer: { id: "c4", name: "Anjali Rao", address: "Route 5" } as any },
  ],
  delivered: [
    { id: "5", customerId: "c5", routeId: "r1", status: "delivered", totalAmount: 96, date: "", createdAt: "", updatedAt: "", items: [], deliveryAgent: { id: "s3", name: "Deepak" } as any, customer: { id: "c5", name: "Kavya Patel", address: "Route 1" } as any },
  ],
  failed: [],
};

const columns = [
  { key: "pending", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

const badgeVariant: Record<string, "gray" | "blue" | "amber" | "green" | "red"> = {
  pending: "gray", assigned: "blue", out_for_delivery: "amber", delivered: "green", failed: "red",
};

export default function Orders() {
  const { data } = useQuery({
    queryKey: ["orders-today"],
    queryFn: () => api.get<{ data: GroupedOrders; total: number }>("/orders/today"),
    placeholderData: { data: MOCK, total: 462 },
  });

  const grouped = data?.data ?? MOCK;

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Order fulfilment</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Today's run · {data?.total ?? 462} orders generated from subscriptions</p>
        </div>
        <div className="flex items-center gap-2.5">
          <LiveBadge label="auto-generated" />
          <Button variant="primary"><i className="ti ti-wand" /> Optimize routes</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {columns.map((col) => {
          const orders = grouped[col.key] ?? [];
          return (
            <div key={col.key} className="bg-[var(--surface-2)] rounded-[14px] p-3.5">
              <div className="flex items-center justify-between mb-3 text-[12.5px] font-semibold">
                {col.label}
                <span className="text-[11px] text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded-full">
                  {orders.length}
                </span>
              </div>
              {orders.map((order) => (
                <div key={order.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[11px] p-3 mb-2 last:mb-0 shadow-sm cursor-grab">
                  <div className="font-semibold text-[13px]">{(order.customer as any)?.name ?? "—"}</div>
                  <div className="text-[11.5px] text-[var(--muted)] mt-0.5">{(order.customer as any)?.address ?? "—"}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {order.items.map((item) => (
                      <span key={item.id} className="text-[10.5px] bg-[var(--surface-2)] text-[var(--muted)] px-1.5 py-0.5 rounded-[6px] font-medium">
                        ×{item.quantity}
                      </span>
                    ))}
                    <span className="text-[10.5px] bg-[var(--surface-2)] text-[var(--muted)] px-1.5 py-0.5 rounded-[6px] font-medium font-mono">
                      {fmt(order.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center text-[12px] text-[var(--faint)] py-6">Empty</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
