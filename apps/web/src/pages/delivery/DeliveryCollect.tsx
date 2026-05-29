import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH() { const t = localStorage.getItem("vdf_token"); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }

export default function DeliveryCollect() {
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    function load() {
      fetch(`${BASE}/delivery/my-route`, { headers: authH() }).then(r => r.json()).then(d => {
        setOrders(d.data?.orders ?? []);
        setSummary(d.data?.summary ?? null);
      }).catch(() => {});
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const delivered = orders.filter(o => o.status === "delivered");
  const total = delivered.reduce((s: number, o: any) => s + (o.collectedAmount ?? o.totalAmount), 0);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Collections</h2>
      <div style={{ background: "var(--green)", borderRadius: 18, padding: 20, textAlign: "center", marginBottom: 16, color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Total collected</div>
        <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "monospace" }}>₹{total.toLocaleString("en-IN")}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{delivered.length} of {summary?.total ?? 0} deliveries complete</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Cash", orders: delivered.filter(o => o.paymentMethod === "cash") },
          { label: "UPI", orders: delivered.filter(o => o.paymentMethod === "upi") },
          { label: "Wallet", orders: delivered.filter(o => o.paymentMethod === "wallet") },
          { label: "Pending", orders: orders.filter(o => o.status !== "delivered" && o.status !== "failed" && o.status !== "cancelled") },
        ].map(cat => (
          <div key={cat.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 13, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginBottom: 4 }}>{cat.label.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{cat.orders.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>
              ₹{cat.orders.reduce((s, o) => s + (o.collectedAmount ?? o.totalAmount), 0).toLocaleString("en-IN")}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "0 14px" }}>
        {delivered.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No deliveries yet</div>}
        {delivered.map((o: any, i: number) => (
          <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < delivered.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.customer?.user?.name ?? "—"}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                {o.paymentMethod ?? "—"} · {o.deliveredAt ? new Date(o.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
            </div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--green-ink)" }}>₹{(o.collectedAmount ?? o.totalAmount).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
