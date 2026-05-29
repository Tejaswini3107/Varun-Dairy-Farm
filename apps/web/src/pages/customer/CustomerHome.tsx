import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH(): Record<string, string> {
  const t = localStorage.getItem("vdf_customer_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function CustomerHome({ user }: { user: any }) {
  const nav = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      // Load subscriptions (uses JWT customerId — no user.customerId needed)
      const subsRes = await fetch(`${BASE}/subscriptions/my`, { headers: authH() });
      if (subsRes.ok) { const d = await subsRes.json(); setSubs(d.data ?? []); }

      // Load customer profile if we have customerId
      const cid = user?.customerId;
      if (cid) {
        const custRes = await fetch(`${BASE}/customers/${cid}`, { headers: authH() });
        if (custRes.ok) { const d = await custRes.json(); setCustomer(d.data); }
      }

      // Generate/fetch today's order — customerId comes from JWT on server side
      const body = cid ? JSON.stringify({ customerId: cid }) : "{}";
      const oRes = await fetch(`${BASE}/orders/generate-for-customer`, {
        method: "POST", headers: authH(), body,
      });
      if (oRes.ok) { const d = await oRes.json(); setOrder(d.data); }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  // Poll every 8s for delivery status updates
  useEffect(() => {
    const t = setInterval(loadData, 8000);
    return () => clearInterval(t);
  }, [user?.customerId]);

  async function changeQty(subId: string, delta: number) {
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;
    const newQty = Math.max(1, Math.min(9, sub.quantity + delta));
    if (newQty === sub.quantity) return;

    const res = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ quantity: newQty }),
    }).then(r => r.json());
    if (res.data) setSubs(prev => prev.map(s => s.id === subId ? res.data : s));

    // Regenerate order with new quantity
    setGenerating(true);
    const cid = user?.customerId;
    const body = cid ? JSON.stringify({ customerId: cid }) : "{}";
    const oRes = await fetch(`${BASE}/orders/generate-for-customer`, {
      method: "POST", headers: authH(), body,
    }).then(r => r.json()).catch(() => null);
    if (oRes?.data) setOrder(oRes.data);
    setGenerating(false);
  }

  const wallet = customer?.walletBalance ?? 0;
  const STATUS: Record<string, { label: string; color: string }> = {
    pending:          { label: "⏳ Scheduled",    color: "var(--blue-ink)"  },
    assigned:         { label: "✅ Agent assigned", color: "var(--green-ink)" },
    out_for_delivery: { label: "🚚 On the way",    color: "var(--green-ink)" },
    delivered:        { label: "✓ Delivered",      color: "var(--green-ink)" },
    failed:           { label: "✗ Failed",         color: "var(--red-ink)"   },
  };
  const ds = STATUS[order?.status ?? "pending"] ?? STATUS.pending;
  const heroBg = order?.status === "delivered" ? "var(--green)" : "var(--blue)";

  return (
    <div style={{ padding: 16, paddingBottom: 24 }}>

      {/* Top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Good morning</div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{user.name}</div>
        </div>
        <div onClick={() => nav("/customer-app/wallet")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: wallet < 0 ? "var(--red-soft)" : "var(--green-soft)", borderRadius: 20, padding: "7px 12px", cursor: "pointer" }}>
          <span>👝</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: wallet < 0 ? "var(--red-ink)" : "var(--green-ink)", fontFamily: "monospace" }}>
            {wallet < 0 ? "−" : ""}₹{Math.abs(wallet).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Today's delivery hero */}
      <div style={{ background: heroBg, borderRadius: 18, padding: 16, marginBottom: 13, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Today's delivery</span>
          <span style={{ background: "#fff", color: ds.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{ds.label}</span>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, opacity: 0.85 }}>Loading your order…</div>
        ) : error ? (
          <div style={{ fontSize: 13, opacity: 0.85 }}>⚠ {error}</div>
        ) : order ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontSize: 22 }}>🥛</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {order.items?.map((i: any) => `${i.product?.name ?? "Item"} ×${i.quantity}`).join(", ")}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {order.deliveryAgent
                  ? `Agent: ${order.deliveryAgent.user?.name ?? "assigned"}`
                  : "Arriving 5:30–9:00 AM"}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>No active subscriptions — add one below.</div>
        )}
      </div>

      {/* Subscriptions */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>My subscriptions</span>
          <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, cursor: "pointer" }}
            onClick={() => nav("/customer-app/subscription")}>Manage</span>
        </div>

        {subs.length === 0 && !loading && (
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>No active subscriptions yet.</p>
        )}

        {subs.map((sub: any, i: number) => (
          <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: i < subs.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>
                {sub.product?.category === "milk" ? "🥛" : sub.product?.category === "curd" ? "🥣" : sub.product?.category === "ghee" ? "🫙" : sub.product?.category === "paneer" ? "🧀" : "📦"}
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sub.product?.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {sub.frequency === "daily" ? "Daily" : sub.frequency} · ₹{sub.product?.pricePerUnit}/{sub.product?.unit}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => changeQty(sub.id, -1)}
                style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 46, textAlign: "center" }}>
                {sub.quantity} {sub.product?.unit}
              </span>
              <button onClick={() => changeQty(sub.id, 1)}
                style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>+</button>
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

      {/* Quick add */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Add to today</span>
          <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, cursor: "pointer" }}
            onClick={() => nav("/customer-app/store")}>Store →</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[{ icon: "🥣", name: "Curd", price: "₹40" }, { icon: "🫙", name: "Ghee", price: "₹320" }, { icon: "🧀", name: "Paneer", price: "₹80" }].map(p => (
            <div key={p.name} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 14, padding: "12px 8px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
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
