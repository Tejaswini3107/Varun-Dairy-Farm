import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH() { const t = localStorage.getItem("vdf_customer_token"); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }

export default function CustomerHome({ user }: { user: any }) {
  const nav = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function loadData() {
    if (!user?.customerId) return;
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${BASE}/customers/${user.customerId}`, { headers: authH() }).then(r => r.json()),
        fetch(`${BASE}/subscriptions/my`, { headers: authH() }).then(r => r.json()),
      ]);
      setCustomer(cRes.data); setSubs(sRes.data ?? []);
      const oRes = await fetch(`${BASE}/orders/generate-for-customer`, { method: "POST", headers: authH(), body: JSON.stringify({ customerId: user.customerId }) }).then(r => r.json());
      setOrder(oRes.data);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [user?.customerId]);
  useEffect(() => { const t = setInterval(loadData, 8000); return () => clearInterval(t); }, [user?.customerId]);

  async function changeQty(subId: string, delta: number) {
    const sub = subs.find(s => s.id === subId); if (!sub) return;
    const newQty = Math.max(1, Math.min(9, sub.quantity + delta));
    if (newQty === sub.quantity) return;
    const res = await fetch(`${BASE}/subscriptions/${subId}`, { method: "PATCH", headers: authH(), body: JSON.stringify({ quantity: newQty }) }).then(r => r.json());
    setSubs(prev => prev.map(s => s.id === subId ? res.data : s));
    setGenerating(true);
    const oRes = await fetch(`${BASE}/orders/generate-for-customer`, { method: "POST", headers: authH(), body: JSON.stringify({ customerId: user.customerId }) }).then(r => r.json()).catch(() => null);
    if (oRes?.data) setOrder(oRes.data);
    setGenerating(false);
  }

  const wallet = customer?.walletBalance ?? 0;
  const ds = ({ pending: { label: "⏳ Scheduled", color: "var(--blue-ink)" }, assigned: { label: "✅ Assigned", color: "var(--green-ink)" }, out_for_delivery: { label: "🚚 On the way", color: "var(--green-ink)" }, delivered: { label: "✓ Delivered", color: "var(--green-ink)" }, failed: { label: "✗ Failed", color: "var(--red-ink)" } } as any)[order?.status ?? "pending"] ?? { label: "⏳ Scheduled", color: "var(--blue-ink)" };

  return (
    <div style={{ padding: 16, paddingBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Good morning</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{user.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: wallet < 0 ? "var(--red-soft)" : "var(--green-soft)", borderRadius: 20, padding: "7px 12px" }}>
          <span>👝</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: wallet < 0 ? "var(--red-ink)" : "var(--green-ink)", fontFamily: "monospace" }}>
            {wallet < 0 ? "−" : ""}₹{Math.abs(wallet).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div style={{ background: order?.status === "delivered" ? "var(--green)" : "var(--blue)", borderRadius: 18, padding: 16, marginBottom: 13, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Today's delivery</span>
          <span style={{ background: "#fff", color: ds.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{ds.label}</span>
        </div>
        {loading ? <div style={{ fontSize: 13, opacity: 0.85 }}>Loading…</div>
          : order ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontSize: 22 }}>🥛</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{order.items?.map((i: any) => `${i.product?.name ?? "Item"} ×${i.quantity}`).join(", ")}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{order.deliveryAgent ? `Agent: ${order.deliveryAgent.user?.name}` : "Arriving 5:30–9:00 AM"}</div>
              </div>
            </div>
          ) : <div style={{ fontSize: 13, opacity: 0.85 }}>No active order</div>}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>My subscriptions</span>
          <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, cursor: "pointer" }} onClick={() => nav("/customer-app/subscription")}>Manage</span>
        </div>
        {subs.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>No active subscriptions.</p>}
        {subs.map((sub: any, i: number) => (
          <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < subs.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{sub.product?.category === "milk" ? "🥛" : sub.product?.category === "curd" ? "🥣" : "📦"}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sub.product?.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Daily · ₹{sub.product?.pricePerUnit}/{sub.product?.unit}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => changeQty(sub.id, -1)} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{sub.quantity} {sub.product?.unit}</span>
              <button onClick={() => changeQty(sub.id, 1)} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>+</button>
            </div>
          </div>
        ))}
        {generating && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>⏳ Updating today's order…</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {["⏸ Pause", "🏖 Vacation"].map(l => (
            <button key={l} style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 40, background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Add to today</span>
          <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, cursor: "pointer" }} onClick={() => nav("/customer-app/store")}>Store</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[{ icon: "🥣", name: "Curd", price: "₹40" }, { icon: "🫙", name: "Ghee", price: "₹320" }, { icon: "🧀", name: "Paneer", price: "₹80" }].map(p => (
            <div key={p.name} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 14, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <span style={{ fontSize: 26 }}>{p.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{p.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
