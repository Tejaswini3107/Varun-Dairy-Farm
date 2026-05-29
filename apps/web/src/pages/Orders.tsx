import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Modal, Field, selectStyle } from "@/components/ui/Modal";

type Status = "pending" | "assigned" | "out_for_delivery" | "delivered" | "failed";
const COLS: { key: Status; label: string }[] = [
  { key: "pending", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

const colColors: Record<string, string> = {
  pending: "var(--surface-2)",
  assigned: "var(--blue-soft)",
  out_for_delivery: "var(--amber-soft)",
  delivered: "var(--green-soft)",
};

export default function Orders() {
  const [assignTarget, setAssignTarget] = useState<{ orderId: string; name: string } | null>(null);
  const [agentId, setAgentId] = useState("");
  const qc = useQueryClient();

  const { data: ordersRes } = useQuery({
    queryKey: ["orders-today"],
    queryFn: () => api.get<{ data: Record<Status, any[]>; total: number }>("/orders/today"),
    refetchInterval: 5000,
  });

  const { data: staffRes } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ data: any[] }>("/staff"),
    refetchInterval: 30000,
  });

  const generateOrders = useMutation({
    mutationFn: () => api.post("/orders/generate", {}),
    onSuccess: (d: any) => { alert(d.message); qc.invalidateQueries(); },
    onError: (e: Error) => alert(e.message),
  });

  const assignOrder = useMutation({
    mutationFn: ({ orderId, deliveryAgentId }: { orderId: string; deliveryAgentId: string }) =>
      api.patch(`/orders/${orderId}/assign`, { deliveryAgentId }),
    onSuccess: () => { qc.invalidateQueries(); setAssignTarget(null); setAgentId(""); },
    onError: (e: Error) => alert(e.message),
  });

  const grouped = ordersRes?.data ?? { pending: [], assigned: [], out_for_delivery: [], delivered: [], failed: [] };
  const total = ordersRes?.total ?? 0;
  const staff = staffRes?.data ?? [];

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Order fulfilment</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Today · {total} orders</p>
        </div>
        <div className="flex items-center gap-2.5">
          <LiveBadge label="auto-generated" />
          <Button onClick={() => generateOrders.mutate()} disabled={generateOrders.isPending}>
            <i className="ti ti-refresh" /> {generateOrders.isPending ? "Generating…" : "Generate orders"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {COLS.map(col => {
          const orders = grouped[col.key] ?? [];
          return (
            <div key={col.key} style={{ background: colColors[col.key] }} className="rounded-[14px] p-3.5">
              <div className="flex items-center justify-between mb-3 text-[12.5px] font-semibold">
                {col.label}
                <span className="text-[11px] text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded-full">{orders.length}</span>
              </div>
              {orders.length === 0 && (
                <div className="text-center text-[12px] text-[var(--faint)] py-6">Empty</div>
              )}
              {orders.map((order: any) => (
                <div key={order.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[11px] p-3 mb-2 last:mb-0 shadow-sm">
                  <div className="font-semibold text-[13px]">{order.customer?.user?.name ?? "—"}</div>
                  <div className="text-[11.5px] text-[var(--muted)] mt-0.5">{order.customer?.area ?? ""}</div>
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {order.items?.slice(0, 3).map((item: any) => (
                      <span key={item.id} className="text-[10.5px] bg-[var(--surface-2)] text-[var(--muted)] px-1.5 py-0.5 rounded-[6px]">
                        {item.product?.name ?? "Item"} ×{item.quantity}
                      </span>
                    ))}
                    <span className="text-[10.5px] bg-[var(--surface-2)] text-[var(--muted)] px-1.5 py-0.5 rounded-[6px] font-mono">
                      {fmt(order.totalAmount)}
                    </span>
                  </div>
                  {order.deliveryAgent && (
                    <div className="text-[11px] text-[var(--blue-ink)] mb-1.5">
                      <i className="ti ti-user text-xs" /> {order.deliveryAgent.user?.name}
                    </div>
                  )}
                  {col.key === "pending" && (
                    <button onClick={() => { setAssignTarget({ orderId: order.id, name: order.customer?.user?.name ?? "—" }); setAgentId(""); }}
                      className="w-full text-[11px] font-semibold text-[var(--blue-ink)] bg-[var(--blue-soft)] border-0 rounded-[8px] py-1.5 cursor-pointer hover:opacity-80">
                      Assign agent →
                    </button>
                  )}
                  {col.key === "delivered" && (
                    <Badge variant="green" className="text-[10px]"><i className="ti ti-check text-[10px]" /> Delivered</Badge>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {assignTarget && (
        <Modal title={`Assign order — ${assignTarget.name}`} onClose={() => setAssignTarget(null)} width={380}>
          <Field label="Select delivery agent">
            <select style={selectStyle} value={agentId} onChange={e => setAgentId(e.target.value)}>
              <option value="">Choose agent…</option>
              {staff.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} · {s.routeName ?? "Unassigned"}</option>
              ))}
            </select>
          </Field>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1" disabled={!agentId || assignOrder.isPending}
              onClick={() => assignOrder.mutate({ orderId: assignTarget.orderId, deliveryAgentId: agentId })}>
              {assignOrder.isPending ? "Assigning…" : "Assign"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
