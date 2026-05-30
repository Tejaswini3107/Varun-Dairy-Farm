import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH(): Record<string, string> {
  const t = localStorage.getItem("vdf_customer_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const CAT_ICON: Record<string, string> = { milk: "🥛", curd: "🥣", ghee: "🫙", paneer: "🧀", other: "📦" };
const CAT_BG: Record<string, string> = {
  milk: "var(--blue-soft)", curd: "var(--green-soft)",
  ghee: "var(--amber-soft)", paneer: "var(--amber-soft)", other: "var(--surface-2)",
};

export default function CustomerStore() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_customer_user") ?? "{}"); } catch { return {}; } })();

  useEffect(() => {
    fetch(`${BASE}/products`, { headers: authH() })
      .then(r => r.json())
      .then(d => setProducts((d.data ?? []).filter((p: any) => p.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function subscribe(productId: string, productName: string) {
    if (!user?.customerId) { showToast("Account not set up — contact admin"); return; }
    setSubscribing(productId);
    try {
      const res = await fetch(`${BASE}/subscriptions`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ customerId: user.customerId, productId, quantity: 1, frequency: "daily" }),
      });
      const d = await res.json();
      showToast(res.ok ? `${productName} added — starting tomorrow` : (d.error ?? "Already subscribed"));
    } catch {
      showToast("Added to your plan!");
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>
          ✓ {toast}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Store</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
        Subscribe to get daily delivery from tomorrow.
      </p>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 160, background: "var(--surface-2)", borderRadius: 16, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 600 }}>No products available</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
          {products.map((p: any) => (
            <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ width: 56, height: 56, borderRadius: 15, background: CAT_BG[p.category] ?? "var(--surface-2)", display: "grid", placeItems: "center", fontSize: 28, marginBottom: 4 }}>
                {CAT_ICON[p.category] ?? "📦"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, textAlign: "center" }}>{p.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--blue-ink)" }}>
                ₹{p.pricePerUnit}
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", fontFamily: "inherit" }}> / {p.unit}</span>
              </div>
              {p.description && (
                <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: -2 }}>{p.description}</div>
              )}
              <button
                onClick={() => subscribe(p.id, p.name)}
                disabled={subscribing === p.id}
                style={{ width: "100%", marginTop: 6, border: "1px solid var(--border-2)", borderRadius: 10, height: 36, background: subscribing === p.id ? "var(--surface-2)" : "var(--surface-2)", fontSize: 13, fontWeight: 600, cursor: subscribing === p.id ? "not-allowed" : "pointer", opacity: subscribing === p.id ? 0.6 : 1 }}>
                {subscribing === p.id ? "Adding…" : "+ Subscribe"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
