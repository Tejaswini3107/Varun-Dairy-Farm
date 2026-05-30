import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH(): Record<string, string> {
  const t = localStorage.getItem("vdf_customer_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const EMOJI: Record<string, string> = { milk: "🥛", curd: "🥣", ghee: "🫙", paneer: "🧀" };
const FREQ_LABEL: Record<string, string> = { daily: "Daily", alternate: "Alt. day", weekly: "Weekly", monthly: "Monthly" };
const FREQ_MULT: Record<string, number> = { daily: 30, alternate: 15, weekly: 4, monthly: 1 };

// 0.5 step for litre-based units, 1 for everything else
function stepFor(unit: string) { return unit === "L" ? 0.5 : 1; }
function fmtQty(qty: number, unit: string) { return `${qty % 1 === 0 ? qty : qty.toFixed(1)} ${unit}`; }

export default function CustomerSubscription() {
  const [subs, setSubs] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Vacation modal
  const [vacModal, setVacModal] = useState(false);
  const [vacFrom, setVacFrom] = useState("");
  const [vacUntil, setVacUntil] = useState("");
  const [vacSaving, setVacSaving] = useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function reload() {
    // Deduplicate first, then reload
    fetch(`${BASE}/subscriptions/deduplicate`, { method: "POST", headers: authH() })
      .then(r => r.json()).then(d => setSubs(d.data ?? []))
      .catch(() =>
        fetch(`${BASE}/subscriptions/my`, { headers: authH() })
          .then(r => r.json()).then(d => setSubs(d.data ?? [])).catch(() => {})
      );
  }

  useEffect(() => { reload(); }, []);

  async function changeQty(subId: string, delta: number) {
    const sub = subs.find(s => s.id === subId);
    if (!sub) return;
    const step = stepFor(sub.product?.unit ?? "");
    const newQty = Math.round((sub.quantity + delta * step) * 10) / 10;
    const clamped = Math.max(step, Math.min(20, newQty));
    setSaving(subId);
    const res = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: "PATCH", headers: authH(),
      body: JSON.stringify({ quantity: clamped }),
    }).then(r => r.json()).catch(() => null);
    if (res?.data) { setSubs(prev => prev.map(s => s.id === subId ? res.data : s)); showToast("Updated"); }
    setSaving(null);
  }

  async function togglePause(subId: string, currentStatus: string) {
    const newStatus = currentStatus === "paused" ? "active" : "paused";
    const res = await fetch(`${BASE}/subscriptions/${subId}`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ status: newStatus }),
    }).then(r => r.json()).catch(() => null);
    if (res?.data) { setSubs(prev => prev.map(s => s.id === subId ? res.data : s)); showToast(newStatus === "paused" ? "Paused" : "Resumed"); }
  }

  async function pauseAll() {
    const allPaused = subs.filter(s => s.status !== "cancelled").every(s => s.status === "paused");
    await fetch(`${BASE}/customers/me/pause-all`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ pause: !allPaused }),
    });
    showToast(allPaused ? "All subscriptions resumed" : "All subscriptions paused");
    reload();
  }

  async function saveVacation() {
    if (!vacFrom || !vacUntil) return;
    setVacSaving(true);
    await fetch(`${BASE}/customers/me/vacation`, {
      method: "PATCH", headers: authH(), body: JSON.stringify({ from: vacFrom, until: vacUntil }),
    });
    setVacSaving(false);
    setVacModal(false);
    showToast("Vacation mode set — deliveries paused");
    reload();
  }

  const activeSubs = subs.filter(s => s.status !== "cancelled");
  const allPaused = activeSubs.length > 0 && activeSubs.every(s => s.status === "paused");

  const monthly = subs
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + s.quantity * (s.product?.pricePerUnit ?? 0) * (FREQ_MULT[s.frequency] ?? 1), 0);

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>

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
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>🏖 Vacation mode</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Deliveries and orders will be paused during this period.</div>
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Subscriptions</h2>
        <span style={{ fontSize: 20 }}>📅</span>
      </div>

      {activeSubs.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No active subscriptions</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Add products from the Store tab.</div>
        </div>
      )}

      {activeSubs.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
          {activeSubs.map((sub: any, i: number) => (
            <div key={sub.id} style={{
              paddingBottom: i < activeSubs.length - 1 ? 12 : 0,
              paddingTop: i > 0 ? 12 : 0,
              borderBottom: i < activeSubs.length - 1 ? "1px solid var(--border)" : "none",
              opacity: sub.status === "paused" || sub.status === "vacation" ? 0.55 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{EMOJI[sub.product?.category] ?? "📦"}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{sub.product?.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {FREQ_LABEL[sub.frequency] ?? sub.frequency} · ₹{sub.product?.pricePerUnit}/{sub.product?.unit}
                    </div>
                    {sub.nextDeliveryDate && sub.status === "active" && (
                      <div style={{ fontSize: 11, color: "var(--blue-ink)", marginTop: 2 }}>
                        Next: {new Date(sub.nextDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => changeQty(sub.id, -1)} disabled={saving === sub.id}
                    style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>−</button>
                  <span style={{ fontSize: 15, fontWeight: 700, minWidth: 44, textAlign: "center" }}>
                    {fmtQty(sub.quantity, sub.product?.unit ?? "")}
                  </span>
                  <button onClick={() => changeQty(sub.id, 1)} disabled={saving === sub.id}
                    style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>+</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => togglePause(sub.id, sub.status)}
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

      {activeSubs.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Delivery controls</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={pauseAll}
              style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 42, background: allPaused ? "var(--amber-soft)" : "var(--surface)", color: allPaused ? "var(--amber-ink)" : "var(--ink)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {allPaused ? "▶ Resume all" : "⏸ Pause all"}
            </button>
            <button onClick={() => setVacModal(true)}
              style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 42, background: "var(--surface)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              🏖 Vacation mode
            </button>
          </div>
        </div>
      )}

      {monthly > 0 && (
        <div style={{ borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: "var(--blue-soft)", padding: 15 }}>
            <div style={{ fontSize: 11, color: "var(--blue-ink)", fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>MONTHLY ESTIMATE</div>
            {subs.filter(s => s.status === "active").map((s: any) => {
              const mult = FREQ_MULT[s.frequency] ?? 1;
              return (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "var(--blue-ink)" }}>{EMOJI[s.product?.category] ?? "📦"} {s.product?.name} · {FREQ_LABEL[s.frequency]}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--blue-ink)" }}>
                    ₹{(s.quantity * (s.product?.pricePerUnit ?? 0) * mult).toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid var(--blue)", paddingTop: 10, marginTop: 4 }}>
              <span style={{ color: "var(--blue-ink)" }}>Total</span>
              <span style={{ fontFamily: "monospace", color: "var(--blue-ink)" }}>₹{monthly.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
