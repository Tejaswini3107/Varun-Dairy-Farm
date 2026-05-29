import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH() { const t = localStorage.getItem("vdf_customer_token"); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; }

export default function CustomerWallet() {
  const [customer, setCustomer] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_customer_user") ?? "{}"); } catch { return {}; } })();

  useEffect(() => {
    if (!user?.customerId) return;
    fetch(`${BASE}/customers/${user.customerId}`, { headers: authH() }).then(r => r.json()).then(d => setCustomer(d.data)).catch(() => {});
    fetch(`${BASE}/billing/transactions?pageSize=20`, { headers: authH() }).then(r => r.json()).then(d => setTxns(d.data ?? [])).catch(() => {});
  }, []);

  const balance = customer?.walletBalance ?? 0;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Wallet</h2>
      <div style={{ background: balance < 0 ? "var(--red)" : "var(--green)", borderRadius: 18, padding: 20, textAlign: "center", marginBottom: 13, color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Available balance</div>
        <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "monospace", letterSpacing: -1, marginBottom: 16 }}>
          {balance < 0 ? "−" : ""}₹{Math.abs(balance).toLocaleString("en-IN")}
        </div>
        <button style={{ width: "100%", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 12, padding: "11px 0", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
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
        {txns.map((t: any, i: number) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < txns.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{t.type?.replace("_", " ") ?? "—"}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} · {t.method}</div>
            </div>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: t.type === "recharge" || t.type === "credit" ? "var(--green-ink)" : "var(--red-ink)" }}>
              {t.type === "recharge" || t.type === "credit" ? "+" : "−"}₹{t.amount.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
