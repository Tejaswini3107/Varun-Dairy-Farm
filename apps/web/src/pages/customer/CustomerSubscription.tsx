import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH(): Record<string, string> {
  const t = localStorage.getItem("vdf_customer_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function CustomerSubscription() {
  const [subs, setSubs] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  useEffect(() => {
    fetch(`${BASE}/subscriptions/my`, { headers: authH() })
      .then(r => r.json()).then(d => setSubs(d.data ?? [])).catch(() => {});
  }, []);

  async function changeQty(subId: string, delta: number) {
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;
    const newQty = Math.max(0, Math.min(9, sub.quantity + delta));
    setSaving(subId);
    const status = newQty === 0 ? "cancelled" : "active";
    const res = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ quantity: newQty === 0 ? 1 : newQty, status }),
    }).then(r => r.json()).catch(() => null);
    if (res?.data) {
      setSubs(prev => prev.map(s => s.id === subId ? res.data : s));
      showToast("Subscription updated");
    }
    setSaving(null);
  }

  async function pauseSub(subId: string, currentStatus: string) {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    const res = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ status: newStatus }),
    }).then(r => r.json()).catch(() => null);
    if (res?.data) {
      setSubs(prev => prev.map(s => s.id === subId ? res.data : s));
      showToast(newStatus === "paused" ? "Paused" : "Resumed");
    }
  }

  const monthly = subs
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + (s.quantity * (s.product?.pricePerUnit ?? 0) * (s.frequency === "daily" ? 30 : s.frequency === "weekly" ? 4 : 1)), 0);

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 100 }}>
          ✓ {toast}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Subscription</h2>
        <span style={{ fontSize: 20 }}>📅</span>
      </div>

      {subs.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No active subscriptions</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Add products from the Store tab.</div>
        </div>
      )}

      {subs.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
          {subs.map((sub: any, i: number) => (
            <div key={sub.id} style={{ paddingBottom: i < subs.length - 1 ? 12 : 0, paddingTop: i > 0 ? 12 : 0, borderBottom: i < subs.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>
                    {sub.product?.category === "milk" ? "🥛" : sub.product?.category === "curd" ? "🥣" : sub.product?.category === "ghee" ? "🫙" : "🧀"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{sub.product?.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {sub.frequency} · ₹{sub.product?.pricePerUnit}/{sub.product?.unit}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => changeQty(sub.id, -1)} disabled={saving === sub.id}
                    style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>−</button>
                  <span style={{ fontSize: 15, fontWeight: 700, minWidth: 40, textAlign: "center" }}>
                    {sub.quantity} {sub.product?.unit}
                  </span>
                  <button onClick={() => changeQty(sub.id, 1)} disabled={saving === sub.id}
                    style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>+</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => pauseSub(sub.id, sub.status)}
                  style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 36, background: sub.status === "paused" ? "var(--amber-soft)" : "var(--surface)", color: sub.status === "paused" ? "var(--amber-ink)" : "var(--ink)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  {sub.status === "paused" ? "▶ Resume" : "⏸ Pause"}
                </button>
                <span style={{ alignSelf: "center", fontSize: 11, color: sub.status === "active" ? "var(--green-ink)" : "var(--amber-ink)", background: sub.status === "active" ? "var(--green-soft)" : "var(--amber-soft)", borderRadius: 20, padding: "3px 10px", fontWeight: 700 }}>
                  {sub.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Delivery controls</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {["⏸ Pause all", "🏖 Vacation mode"].map(l => (
            <button key={l} style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 42, background: "var(--surface)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <button style={{ width: "100%", border: "1px solid var(--border-2)", borderRadius: 11, height: 42, background: "var(--surface)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          ⏱ Temporary change for tomorrow
        </button>
      </div>

      {monthly > 0 && (
        <div style={{ background: "var(--blue-soft)", borderRadius: 14, padding: 15, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--blue-ink)" }}>Est. monthly bill</span>
          <span style={{ fontWeight: 700, color: "var(--blue-ink)", fontFamily: "monospace" }}>₹{monthly.toLocaleString("en-IN")}</span>
        </div>
      )}
    </div>
  );
}
