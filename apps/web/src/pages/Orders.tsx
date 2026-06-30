import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { Modal, Field, selectStyle } from "@/components/ui/Modal";

type Status = "pending" | "assigned" | "out_for_delivery" | "delivered" | "failed" | "skipped";

const COLS: { key: Status; label: string; color: string; headerColor: string }[] = [
  { key: "pending",          label: "New",             color: "var(--surface-2)",  headerColor: "var(--ink)" },
  { key: "assigned",         label: "Assigned",        color: "var(--blue-soft)",  headerColor: "var(--blue-ink)" },
  { key: "out_for_delivery", label: "Out for delivery",color: "var(--amber-soft)", headerColor: "var(--amber-ink)" },
  { key: "delivered",        label: "Delivered",       color: "var(--green-soft)", headerColor: "var(--green-ink)" },
  { key: "failed",           label: "Failed",          color: "var(--red-soft)",   headerColor: "var(--red-ink)" },
  { key: "skipped",          label: "Skipped",         color: "var(--surface-2)",  headerColor: "var(--muted)" },
];

const PRODUCT_ICON: Record<string, string> = {
  milk: "🥛", toned: "🥛", raw: "🥛",
  curd: "🍶", dahi: "🍶",
  ghee: "🫙", butter: "🧈",
  paneer: "🧀", cheese: "🧀",
};

function productIcon(name: string) {
  const lower = (name ?? "").toLowerCase();
  for (const [key, icon] of Object.entries(PRODUCT_ICON)) {
    if (lower.includes(key)) return icon;
  }
  return "📦";
}

export default function Orders() {
  const [assignTarget, setAssignTarget] = useState<{ orderId: string; name: string } | null>(null);
  const [agentId, setAgentId] = useState("");
  const [detailOrder, setDetailOrder] = useState<any>(null);
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

  const retryOrder = useMutation({
    mutationFn: (orderId: string) => api.patch(`/orders/${orderId}/status`, { status: "assigned" }),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => alert(e.message),
  });

  const grouped = ordersRes?.data ?? { pending: [], assigned: [], out_for_delivery: [], delivered: [], failed: [], skipped: [] };
  const total = ordersRes?.total ?? 0;
  const staff = staffRes?.data ?? [];

  const failedCount = (grouped["failed"] ?? []).length;
  const outCount = (grouped["out_for_delivery"] ?? []).length;
  const skippedCount = (grouped["skipped"] ?? []).length;

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Order fulfilment</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">
            Today · {total} orders
            {outCount > 0 && <span className="ml-2 text-[var(--amber-ink)] font-semibold">· {outCount} on the road</span>}
            {failedCount > 0 && <span className="ml-2 text-[var(--red-ink)] font-semibold">· {failedCount} failed</span>}
            {skippedCount > 0 && <span className="ml-2 text-[var(--muted)] font-semibold">· {skippedCount} skipped</span>}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <LiveBadge label="auto-generated" />
          <Button onClick={() => generateOrders.mutate()} disabled={generateOrders.isPending}>
            <i className="ti ti-refresh" /> {generateOrders.isPending ? "Generating…" : "Generate orders"}
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        {COLS.map(col => {
          const orders = grouped[col.key] ?? [];
          return (
            <div key={col.key} style={{ background: col.color, borderRadius: 14, padding: 12, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: col.headerColor }}>{col.label}</span>
                <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface)", borderRadius: 20, padding: "1px 8px" }}>{orders.length}</span>
              </div>

              {orders.length === 0 && (
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--faint)", padding: "20px 0" }}>Empty</div>
              )}

              {orders.map((order: any) => (
                <div key={order.id}
                  onClick={() => setDetailOrder(order)}
                  style={{ background: "var(--surface)", border: `1px solid ${col.key === "failed" ? "var(--red)" : "var(--border)"}`, borderRadius: 11, padding: 10, marginBottom: 8, cursor: "pointer", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{order.customer?.user?.name ?? "—"}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{order.customer?.area ?? ""}</div>

                  {/* Items with icons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, marginBottom: 4 }}>
                    {order.items?.slice(0, 3).map((item: any) => (
                      <span key={item.id} style={{ fontSize: 10, background: "var(--surface-2)", color: "var(--muted)", padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 3 }}>
                        <span>{productIcon(item.product?.name)}</span>
                        <span>{item.product?.name ?? "Item"} ×{item.quantity}</span>
                      </span>
                    ))}
                    <span style={{ fontSize: 10, background: "var(--surface-2)", color: "var(--muted)", padding: "2px 6px", borderRadius: 6, fontFamily: "monospace", fontWeight: 700 }}>
                      {fmt(order.totalAmount)}
                    </span>
                  </div>

                  {/* Agent */}
                  {order.deliveryAgent && (
                    <div style={{ fontSize: 11, color: "var(--blue-ink)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <i className="ti ti-motorbike" style={{ fontSize: 12 }} />
                      {order.deliveryAgent.user?.name}
                    </div>
                  )}

                  {/* Fail reason */}
                  {col.key === "failed" && order.notes && (
                    <div style={{ fontSize: 10, color: "var(--red-ink)", background: "var(--red-soft)", borderRadius: 6, padding: "2px 6px", marginBottom: 4 }}>
                      ⚠ {order.notes}
                    </div>
                  )}

                  {/* Delivered time */}
                  {col.key === "delivered" && order.deliveredAt && (
                    <div style={{ fontSize: 10, color: "var(--green-ink)", display: "flex", alignItems: "center", gap: 4 }}>
                      <i className="ti ti-check" style={{ fontSize: 11 }} />
                      {new Date(order.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {order.paymentMethod && <span style={{ marginLeft: 4, textTransform: "capitalize" }}>· {order.paymentMethod}</span>}
                    </div>
                  )}

                  {/* Out for delivery indicator */}
                  {col.key === "out_for_delivery" && (
                    <div style={{ fontSize: 10, color: "var(--amber-ink)", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                      <i className="ti ti-truck-delivery" style={{ fontSize: 12 }} /> On the way
                    </div>
                  )}

                  {/* Skipped indicator */}
                  {col.key === "skipped" && (
                    <div style={{ fontSize: 10, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <i className="ti ti-player-skip-forward" style={{ fontSize: 12 }} /> Customer skipped
                    </div>
                  )}

                  {/* Assign button */}
                  {col.key === "pending" && (
                    <button
                      onClick={e => { e.stopPropagation(); setAssignTarget({ orderId: order.id, name: order.customer?.user?.name ?? "—" }); setAgentId(""); }}
                      style={{ width: "100%", fontSize: 11, fontWeight: 600, color: "var(--blue-ink)", background: "var(--blue-soft)", border: "none", borderRadius: 8, padding: "5px 0", cursor: "pointer", marginTop: 4 }}>
                      Assign agent →
                    </button>
                  )}

                  {/* Retry failed */}
                  {col.key === "failed" && (
                    <button
                      onClick={e => { e.stopPropagation(); retryOrder.mutate(order.id); }}
                      style={{ width: "100%", fontSize: 11, fontWeight: 600, color: "var(--red-ink)", background: "var(--red-soft)", border: "1px solid var(--red)", borderRadius: 8, padding: "5px 0", cursor: "pointer", marginTop: 4 }}>
                      ↺ Retry delivery
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Order detail modal */}
      {detailOrder && (
        <Modal title={`Order — ${detailOrder.customer?.user?.name ?? "—"}`} onClose={() => setDetailOrder(null)} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>CUSTOMER</div>
              <div style={{ fontWeight: 700 }}>{detailOrder.customer?.user?.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{detailOrder.customer?.address}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{detailOrder.customer?.user?.phone}</div>
            </div>
            <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>ITEMS</div>
              {detailOrder.items?.map((item: any) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{productIcon(item.product?.name)} {item.product?.name} ×{item.quantity}</span>
                  <span style={{ fontFamily: "monospace" }}>{fmt(item.totalPrice)}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total</span><span style={{ fontFamily: "monospace" }}>{fmt(detailOrder.totalAmount)}</span>
              </div>
            </div>
            {detailOrder.deliveryAgent && (
              <div style={{ background: "var(--blue-soft)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "var(--blue-ink)", fontWeight: 600, marginBottom: 2 }}>DELIVERY AGENT</div>
                <div style={{ fontWeight: 700, color: "var(--blue-ink)" }}>{detailOrder.deliveryAgent.user?.name}</div>
              </div>
            )}
            {detailOrder.status === "delivered" && (
              <div style={{ background: "var(--green-soft)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "var(--green-ink)", fontWeight: 600, marginBottom: 2 }}>DELIVERED</div>
                <div style={{ fontSize: 13 }}>
                  {detailOrder.deliveredAt && new Date(detailOrder.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  {detailOrder.paymentMethod && ` · ${detailOrder.paymentMethod} · `}
                  {detailOrder.collectedAmount != null && fmt(detailOrder.collectedAmount)}
                </div>
              </div>
            )}
            {detailOrder.status === "failed" && (
              <div style={{ background: "var(--red-soft)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "var(--red-ink)", fontWeight: 600, marginBottom: 2 }}>FAILED — REASON</div>
                <div style={{ fontSize: 13, color: "var(--red-ink)" }}>{detailOrder.notes ?? "No reason recorded"}</div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Assign modal */}
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
