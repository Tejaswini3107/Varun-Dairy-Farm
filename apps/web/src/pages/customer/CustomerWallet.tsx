import { useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
function authH() { const t = localStorage.getItem("vdf_customer_token"); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }

const PRESETS = [100, 200, 500, 1000];

export default function CustomerWallet() {
  const [customer, setCustomer] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [recharging, setRecharging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_customer_user") ?? "{}"); } catch { return {}; } })();

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function load() {
    fetch(`${BASE}/customers/me`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setCustomer(d.data);
          setTxns(d.data.transactions ?? []);
        }
      })
      .catch(() => {});
  }

  useEffect(() => { load(); }, []);

  async function doRecharge() {
    const amt = parseInt(amount);
    if (!amt || amt < 10) return;
    setRecharging(true);
    try {
      const res = await fetch(`${BASE}/customers/${user.customerId}/recharge-wallet`, {
        method: "POST", headers: authH(), body: JSON.stringify({ amount: amt }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error ?? "Recharge failed"); }
      else { showToast(`₹${amt} added to wallet`); setRechargeModal(false); setAmount(""); load(); }
    } catch { showToast("Network error"); }
    finally { setRecharging(false); }
  }

  const balance = customer?.walletBalance ?? 0;

  return (
    <div style={{ padding: 16 }}>
      {toast && (
        <div style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", background: "var(--green)", color: "#fff", borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", whiteSpace: "nowrap" }}>
          ✓ {toast}
        </div>
      )}

      {rechargeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", boxSizing: "border-box" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>+ Recharge wallet</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {PRESETS.map(p => (
                <button key={p} onClick={() => setAmount(String(p))}
                  style={{ padding: "10px 0", borderRadius: 10, border: `1.5px solid ${amount === String(p) ? "var(--blue)" : "var(--border-2)"}`, background: amount === String(p) ? "var(--blue-soft)" : "var(--surface)", color: amount === String(p) ? "var(--blue-ink)" : "var(--ink)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  ₹{p}
                </button>
              ))}
            </div>
            <input
              type="number" min="10" placeholder="Or enter amount"
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border-2)", fontSize: 18, fontWeight: 700, fontFamily: "monospace", background: "var(--surface)", color: "var(--ink)", marginBottom: 16, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setRechargeModal(false); setAmount(""); }}
                style={{ flex: 1, height: 48, borderRadius: 12, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={doRecharge} disabled={recharging || !amount || parseInt(amount) < 10}
                style={{ flex: 2, height: 48, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (!amount || parseInt(amount) < 10) ? 0.5 : 1 }}>
                {recharging ? "Processing…" : `Add ₹${amount || "—"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Wallet</h2>
      <div style={{ background: balance < 0 ? "var(--red)" : "var(--green)", borderRadius: 18, padding: 20, textAlign: "center", marginBottom: 13, color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Available balance</div>
        <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "monospace", letterSpacing: -1, marginBottom: 16 }}>
          {balance < 0 ? "−" : ""}₹{Math.abs(balance).toLocaleString("en-IN")}
        </div>
        <button onClick={() => setRechargeModal(true)}
          style={{ width: "100%", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
          + Recharge wallet
        </button>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 15, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Auto-pay</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>UPI mandate · ₹2,000 cap</div>
        </div>
        <span style={{ background: customer?.autoPay ? "var(--green-soft)" : "var(--surface-2)", color: customer?.autoPay ? "var(--green-ink)" : "var(--muted)", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
          {customer?.autoPay ? "On" : "Off"}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>RECENT TRANSACTIONS</div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "0 15px" }}>
        {txns.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No transactions yet</div>}
        {txns.map((t: any, i: number) => {
          const isCredit = ["recharge", "credit", "refund"].includes(t.type);
          return (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < txns.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, textTransform: "capitalize" }}>{t.type?.replace(/_/g, " ") ?? "—"}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                  {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  {t.method ? ` · ${t.method}` : ""}
                </div>
              </div>
              <span style={{ fontFamily: "monospace", fontWeight: 700, color: isCredit ? "var(--green-ink)" : "var(--red-ink)" }}>
                {isCredit ? "+" : "−"}₹{t.amount.toLocaleString("en-IN")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
