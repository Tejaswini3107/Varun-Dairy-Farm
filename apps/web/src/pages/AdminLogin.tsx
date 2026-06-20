import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export default function AdminLogin() {
  // Clear any stale old key from before the portal split
  if (typeof window !== "undefined") localStorage.removeItem("vdf_token");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();

  async function sendOtp() {
    if (phone.length !== 10) { setError("Enter 10-digit number"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json();
      setDevOtp(d.code ?? null);
      setStep("otp");
    } catch { setError("Failed to send OTP"); }
    finally { setLoading(false); }
  }

  async function verify() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid OTP"); return; }
      if (!["admin", "manager"].includes(data.data.user.role)) {
        setError("This portal is for admins only."); return;
      }
      localStorage.setItem("vdf_admin_token", data.data.token);
      localStorage.setItem("vdf_admin_user", JSON.stringify(data.data.user));
      nav("/");
    } catch { setError("Verification failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--blue)", display: "grid", placeItems: "center", fontSize: 24 }}>🥛</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Varun Dairy Farm</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Admin Portal · Hyderabad</div>
          </div>
        </div>

        {step === "phone" ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile number</div>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: 12, padding: "0 14px", height: 52, marginBottom: 14 }}>
              <span style={{ color: "var(--muted)", marginRight: 8 }}>+91</span>
              <input value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                placeholder="91XXXXXXXX" autoFocus
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 17, fontWeight: 600, letterSpacing: 2, color: "var(--ink)", fontFamily: "inherit" }} />
            </div>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={sendOtp} disabled={loading || phone.length !== 10}
              style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: phone.length === 10 ? 1 : 0.5 }}>
              {loading ? "Sending…" : "Send OTP →"}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>OTP sent to +91 {phone}</p>
            {devOtp && (
              <div style={{ background: "var(--amber-soft)", border: "1px solid var(--amber)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <span style={{ color: "var(--amber-ink)", fontSize: 13 }}>🔑 Dev OTP: </span>
                <b onClick={() => setOtp(devOtp)} style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 4, color: "var(--amber-ink)", cursor: "pointer" }}>{devOtp}</b>
                <span style={{ color: "var(--amber-ink)", fontSize: 11, marginLeft: 8 }}>(click to fill)</span>
              </div>
            )}
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit OTP" maxLength={4} autoFocus
              style={{ width: "100%", height: 52, border: "1.5px solid var(--border-2)", borderRadius: 12, padding: "0 16px", fontSize: 26, fontWeight: 700, letterSpacing: 8, textAlign: "center", background: "var(--surface)", color: "var(--ink)", outline: "none", fontFamily: "monospace", marginBottom: 14, boxSizing: "border-box" }} />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={verify} disabled={loading || otp.length < 4}
              style={{ width: "100%", height: 52, background: "var(--green)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: otp.length === 4 ? 1 : 0.5, marginBottom: 10 }}>
              {loading ? "Verifying…" : "Enter Admin Portal"}
            </button>
            <button onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              style={{ width: "100%", height: 40, background: "none", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>← Back</button>
          </>
        )}

        <div style={{ marginTop: 24, padding: 14, background: "var(--surface-2)", borderRadius: 12, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>ADMIN ACCOUNTS</div>
          {[{ name: "Varun (Owner)", phone: "9100000000" }].map(u => (
            <div key={u.phone} onClick={() => { setPhone(u.phone); setStep("phone"); }}
              style={{ cursor: "pointer", padding: "4px 0", color: "var(--ink)" }}>
              <b>{u.name}</b> — <span style={{ fontFamily: "monospace" }}>{u.phone}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
