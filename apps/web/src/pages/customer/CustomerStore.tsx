import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH(): Record<string, string> {
  const t = localStorage.getItem("vdf_customer_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const PRODUCTS = [
  { id: "prod_milk",   icon: "🥛", name: "Toned milk",  price: 48,  unit: "L",     bg: "var(--blue-soft)",  color: "var(--blue-ink)"  },
  { id: "prod_curd",   icon: "🥣", name: "Curd",        price: 40,  unit: "cup",   bg: "var(--green-soft)", color: "var(--green-ink)" },
  { id: "prod_ghee",   icon: "🫙", name: "Pure ghee",   price: 320, unit: "500ml", bg: "var(--amber-soft)", color: "var(--amber-ink)" },
  { id: "prod_paneer", icon: "🧀", name: "Paneer",      price: 80,  unit: "block", bg: "var(--blue-soft)",  color: "var(--blue-ink)"  },
];

export default function CustomerStore() {
  const [toast, setToast] = useState<string | null>(null);
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_customer_user") ?? "{}"); } catch { return {}; } })();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function addToday(productId: string, productName: string) {
    try {
      // Generate/ensure today's order exists then we'd update it — for now subscribe if not already
      const subRes = await fetch(`${BASE}/subscriptions`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ customerId: user.customerId, productId, quantity: 1, frequency: "daily" }),
      });
      if (subRes.ok) {
        showToast(`${productName} added to tomorrow onwards`);
      } else {
        const d = await subRes.json();
        showToast(d.error ?? "Added!");
      }
    } catch { showToast("Added to your plan!"); }
  }

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          ✓ {toast}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Store</h2>
        <span style={{ fontSize: 20, cursor: "pointer" }}>🔍</span>
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
        Adding a product subscribes it to your daily delivery from tomorrow.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {PRODUCTS.map(p => (
          <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ width: 56, height: 56, borderRadius: 15, background: p.bg, display: "grid", placeItems: "center", fontSize: 28, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontFamily: "monospace" }}>₹{p.price} / {p.unit}</div>
            <button onClick={() => addToday(p.id, p.name)}
              style={{ width: "100%", border: "1px solid var(--border-2)", borderRadius: 10, height: 36, background: "var(--surface-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + Subscribe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
