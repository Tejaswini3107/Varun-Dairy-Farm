import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH(): Record<string, string> {
  const t = localStorage.getItem("vdf_customer_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const EMOJI: Record<string, string> = { milk: "🥛", curd: "🥣", ghee: "🫙", paneer: "🧀" };
const FREQ_LABEL: Record<string, string> = { daily: "Daily", alternate: "Alt. day", weekly: "Weekly", monthly: "Monthly" };
function stepFor(unit: string) { return unit === "L" ? 0.5 : 1; }
function fmtQty(qty: number, unit: string) { return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}`; }

export default function CustomerHome({ user }: { user: any }) {
  const nav = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [tomorrow, setTomorrow] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Vacation modal state
  const [storeProducts, setStoreProducts] = useState<any[]>([]);

  const [vacModal, setVacModal] = useState(false);
  const [vacFrom, setVacFrom] = useState("");
  const [vacUntil, setVacUntil] = useState("");
  const [vacSaving, setVacSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [skipping, setSkipping] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function loadData() {
    try {
      const [meRes, tmrRes] = await Promise.all([
        fetch(`${BASE}/customers/me`, { headers: authH() }),
        fetch(`${BASE}/customers/me/tomorrow`, { headers: authH() }),
      ]);
      if (meRes.ok) {
        const d = await meRes.json();
        const c = d.data;
        setCustomer(c);
        setSubs(c?.subscriptions ?? []);
        setOrder(c?.orders?.[0] ?? null);
      }
      if (tmrRes.ok) {
        const d = await tmrRes.json();
        setTomorrow(d.data ?? []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Load store products once
  useEffect(() => {
    fetch(`${BASE}/products`, { headers: authH() })
      .then(r => r.json())
      .then(d => setStoreProducts((d.data ?? []).filter((p: any) => p.isActive).slice(0, 3)))
      .catch(() => {});
  }, []);

  // Initial load + ensure today's order exists
  useEffect(() => {
    loadData();
    // Seed today's order if it doesn't exist yet (idempotent)
    fetch(`${BASE}/orders/recalculate-for-customer`, {
      method: "POST", headers: authH(), body: "{}",
    }).then(r => r.json()).then(d => { if (d.data) setOrder(d.data); }).catch(() => {});
  }, []);

  // Poll every 8s for delivery status
  useEffect(() => {
    const t = setInterval(loadData, 8000);
    return () => clearInterval(t);
  }, []);

  async function changeQty(subId: string, delta: number) {
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;
    const step = stepFor(sub.product?.unit ?? "");
    const newQty = Math.round((sub.quantity + delta * step) * 10) / 10;
    const clamped = Math.max(step, Math.min(20, newQty));
    if (clamped === sub.quantity) return;

    // Optimistic UI update
    setSubs(prev => prev.map(s => s.id === subId ? { ...s, quantity: clamped } : s));

    await fetch(`${BASE}/subscriptions/${subId}`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ quantity: clamped }),
    });

    setGenerating(true);
    await loadData();
    setGenerating(false);
  }

  async function pauseAll() {
    const allPaused = subs.every(s => s.status === "paused");
    await fetch(`${BASE}/customers/me/pause-all`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ pause: !allPaused }),
    });
    showToast(allPaused ? "Subscriptions resumed" : "All subscriptions paused");
    loadData();
  }

  async function saveVacation() {
    if (!vacFrom || !vacUntil) return;
    setVacSaving(true);
    await fetch(`${BASE}/customers/me/vacation`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ from: vacFrom, until: vacUntil }),
    });
    setVacSaving(false);
    setVacModal(false);
    showToast("Vacation mode set");
    loadData();
  }

  async function skipToday() {
    if (!order?.id) return;
    setSkipping(true);
    try {
      await fetch(`${BASE}/orders/${order.id}/skip`, { method: "POST", headers: authH() });
      showToast("Today's delivery skipped");
      loadData();
    } catch { showToast("Could not skip — try again"); }
    finally { setSkipping(false); }
  }

  const wallet = customer?.walletBalance ?? 0;
  const allPaused = subs.length > 0 && subs.every(s => s.status === "paused");

  const monthly = subs
    .filter(s => s.status === "active")
    .reduce((sum, s) => {
      const mult = s.frequency === "daily" ? 30 : s.frequency === "alternate" ? 15 : s.frequency === "weekly" ? 4 : 1;
      return sum + s.quantity * (s.product?.pricePerUnit ?? 0) * mult;
    }, 0);

  const STATUS: Record<string, { label: string; color: string }> = {
    pending:          { label: "⏳ Scheduled",     color: "var(--blue-ink)"  },
    assigned:         { label: "✅ Agent assigned", color: "var(--green-ink)" },
    out_for_delivery: { label: "🚚 On the way",     color: "var(--green-ink)" },
    delivered:        { label: "✓ Delivered",       color: "var(--green-ink)" },
    failed:           { label: "✗ Failed",          color: "var(--red-ink)"   },
  };
  const ds = STATUS[order?.status ?? "pending"] ?? STATUS.pending;
  const heroBg = order?.status === "delivered" ? "var(--green)" : "var(--blue)";

  return (
    <div style={{ padding: 16, paddingBottom: 24 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap" }}>
          ✓ {toast}
        </div>
      )}

      {/* Vacation modal */}
      {vacModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", boxSizing: "border-box" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>🏖 Set vacation dates</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>From
                <input type="date" value={vacFrom} onChange={e => setVacFrom(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-2)", fontSize: 14, background: "var(--surface)", color: "var(--ink)", boxSizing: "border-box" }} />
              </label>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>Until
                <input type="date" value={vacUntil} onChange={e => setVacUntil(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-2)", fontSize: 14, background: "var(--surface)", color: "var(--ink)", boxSizing: "border-box" }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setVacModal(false)}
                style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveVacation} disabled={vacSaving || !vacFrom || !vacUntil}
                style={{ flex: 2, height: 44, borderRadius: 12, border: "none", background: "var(--blue)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!vacFrom || !vacUntil) ? 0.5 : 1 }}>
                {vacSaving ? "Saving…" : "Set vacation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
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

      {/* Low balance warning */}
      {!loading && wallet < 200 && wallet >= 0 && (
        <div style={{ background: "var(--amber-soft)", border: "1px solid var(--amber)", borderRadius: 14, padding: "12px 14px", marginBottom: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--amber-ink)" }}>⚠ Low wallet balance</div>
            <div style={{ fontSize: 12, color: "var(--amber-ink)", marginTop: 2, opacity: 0.85 }}>Add funds to avoid delivery pause</div>
          </div>
          <button onClick={() => nav("/customer-app/wallet")}
            style={{ background: "var(--amber)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Recharge →
          </button>
        </div>
      )}
      {!loading && wallet < 0 && (
        <div style={{ background: "var(--red-soft)", border: "1px solid var(--red)", borderRadius: 14, padding: "12px 14px", marginBottom: 13, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--red-ink)" }}>🔴 Negative balance</div>
            <div style={{ fontSize: 12, color: "var(--red-ink)", marginTop: 2, opacity: 0.85 }}>Deliveries on hold until recharged</div>
          </div>
          <button onClick={() => nav("/customer-app/wallet")}
            style={{ background: "var(--red)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Recharge →
          </button>
        </div>
      )}

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
                  : "Arriving 5:30–9:00 AM"} · ₹{order.totalAmount}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>No deliveries scheduled for today.</div>
        )}
        {order && !["delivered", "failed", "cancelled"].includes(order.status ?? "") && (
          <button onClick={skipToday} disabled={skipping}
            style={{ marginTop: 12, width: "100%", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 11, padding: "9px 0", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", opacity: skipping ? 0.6 : 1 }}>
            {skipping ? "Skipping…" : "⏭ Skip today's delivery"}
          </button>
        )}
      </div>

      {/* Tomorrow's delivery */}
      {tomorrow.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10, color: "var(--muted)" }}>Tomorrow's delivery</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tomorrow.map((s: any) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-2)", borderRadius: 20, padding: "5px 12px", fontSize: 13 }}>
                <span>{EMOJI[s.product?.category] ?? "📦"}</span>
                <span style={{ fontWeight: 600 }}>{s.product?.name}</span>
                <span style={{ color: "var(--muted)" }}>×{s.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

        {subs.filter(s => s.status !== "cancelled").map((sub: any, i: number, arr: any[]) => (
          <div key={sub.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            opacity: sub.status === "paused" || sub.status === "vacation" ? 0.55 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{EMOJI[sub.product?.category] ?? "📦"}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sub.product?.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {FREQ_LABEL[sub.frequency] ?? sub.frequency} · ₹{sub.product?.pricePerUnit}/{sub.product?.unit}
                  {sub.status !== "active" && <span style={{ marginLeft: 6, color: "var(--amber-ink)", fontWeight: 700 }}>({sub.status})</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => changeQty(sub.id, -1)}
                style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 46, textAlign: "center" }}>
                {fmtQty(sub.quantity, sub.product?.unit ?? "")}
              </span>
              <button onClick={() => changeQty(sub.id, 1)}
                style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>+</button>
            </div>
          </div>
        ))}

        {generating && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>⏳ Updating today's order…</div>}

        {subs.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={pauseAll}
              style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 40, background: allPaused ? "var(--amber-soft)" : "var(--surface)", color: allPaused ? "var(--amber-ink)" : "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {allPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button onClick={() => setVacModal(true)}
              style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 40, background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🏖 Vacation
            </button>
          </div>
        )}
      </div>

      {/* Monthly summary */}
      {monthly > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>Monthly summary</div>
          {subs.filter(s => s.status === "active").map((s: any) => {
            const mult = s.frequency === "daily" ? 30 : s.frequency === "alternate" ? 15 : s.frequency === "weekly" ? 4 : 1;
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 6, marginBottom: 6, borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted)" }}>{s.product?.name} ({FREQ_LABEL[s.frequency]})</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>₹{(s.quantity * s.product?.pricePerUnit * mult).toLocaleString("en-IN")}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
            <span>Est. monthly total</span>
            <span style={{ fontFamily: "monospace", color: "var(--blue-ink)" }}>₹{monthly.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {/* Quick add */}
      {storeProducts.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Add to today</span>
            <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600, cursor: "pointer" }}
              onClick={() => nav("/customer-app/store")}>Store →</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {storeProducts.map((p: any) => (
              <div key={p.id} onClick={() => nav("/customer-app/store")}
                style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 14, padding: "12px 8px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <span style={{ fontSize: 26 }}>{EMOJI[p.category] ?? "📦"}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>₹{p.pricePerUnit}/{p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
