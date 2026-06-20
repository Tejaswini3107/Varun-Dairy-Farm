import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export default function CustomerLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [devOtp, setDevOtp] = useState<string | null>(null);
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
      const devData = await res.json();
      setDevOtp(devData.code ?? null);
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
      if (data.data.user.role !== "customer") {
        setError("This portal is for customers only. Use the Delivery App instead."); return;
      }
      localStorage.setItem("vdf_customer_token", data.data.token);
      localStorage.setItem("vdf_customer_user", JSON.stringify(data.data.user));
      nav("/customer-app/home");
    } catch { setError("Verification failed"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--green)", display: "grid", placeItems: "center", fontSize: 32, marginBottom: 20 }}>🥛</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Customer Login</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>Varun Dairy Farm · Hyderabad</p>

        {step === "phone" ? (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile number</label>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: 12, padding: "0 14px", height: 52, marginTop: 6, marginBottom: 14 }}>
              <span style={{ color: "var(--muted)", marginRight: 8, fontSize: 15 }}>+91</span>
              <input value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                placeholder="98XXXXXXXX" style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 17, fontWeight: 600, letterSpacing: 2, color: "var(--ink)", fontFamily: "inherit" }} />
            </div>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={sendOtp} disabled={loading || phone.length !== 10}
              style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: phone.length === 10 ? "pointer" : "not-allowed", opacity: phone.length === 10 ? 1 : 0.5 }}>
              {loading ? "Sending…" : "Send OTP →"}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>OTP sent to +91 {phone}</p>
            {devOtp && (
              <div style={{ background: "var(--amber-soft)", border: "1px solid var(--amber)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                <span style={{ color: "var(--amber-ink)" }}>🔑 Dev OTP: </span>
                <b style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: 4, color: "var(--amber-ink)", cursor: "pointer" }} onClick={() => setOtp(devOtp)}>{devOtp}</b>
                <span style={{ color: "var(--amber-ink)", fontSize: 11, marginLeft: 8 }}>(click to fill)</span>
              </div>
            )}
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Enter 4-digit OTP" maxLength={4}
              style={{ width: "100%", height: 52, border: "1.5px solid var(--border-2)", borderRadius: 12, padding: "0 16px", fontSize: 24, fontWeight: 700, letterSpacing: 8, textAlign: "center", background: "var(--surface)", color: "var(--ink)", outline: "none", fontFamily: "monospace", marginBottom: 14, boxSizing: "border-box" }} />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={verify} disabled={loading || otp.length < 4}
              style={{ width: "100%", height: 52, background: "var(--green)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: otp.length === 4 ? "pointer" : "not-allowed", opacity: otp.length === 4 ? 1 : 0.5, marginBottom: 12 }}>
              {loading ? "Verifying…" : "Verify & Enter"}
            </button>
            <button onClick={() => { setStep("phone"); setDevOtp(null); setOtp(""); setError(""); }}
              style={{ width: "100%", height: 40, background: "none", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
              ← Change number
            </button>
          </>
        )}

        <div style={{ marginTop: 28, padding: 14, background: "var(--surface-2)", borderRadius: 12, fontSize: 12 }}>
          <p style={{ fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>TEST ACCOUNTS</p>
          {[
            { name: "Meera Reddy",   phone: "9800000001", area: "Kondapur · ₹850 wallet" },
            { name: "Kavya Patel",   phone: "9800000003", area: "Kondapur · ₹1,200 wallet" },
            { name: "Anjali Rao",    phone: "9800000004", area: "Madhapur · ₹600 wallet" },
            { name: "Priya Das",     phone: "9800000008", area: "Jubilee Hills · ₹3,200 wallet" },
            { name: "Rahul Mehta",   phone: "9800000005", area: "Madhapur · −₹180 dues" },
          ].map(u => (
            <div key={u.phone} onClick={() => { setPhone(u.phone); setStep("phone"); }}
              style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", cursor: "pointer", color: "var(--ink)" }}>
              <b>{u.name}</b> — <span style={{ fontFamily: "monospace" }}>{u.phone}</span>
              <span style={{ color: "var(--muted)", marginLeft: 8 }}>{u.area}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
