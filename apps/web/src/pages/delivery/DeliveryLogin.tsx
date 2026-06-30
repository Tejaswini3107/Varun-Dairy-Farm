import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type Step = "phone" | "pin" | "setup" | "reset";

const pinInputStyle: React.CSSProperties = {
  width: "100%", height: 56, border: "1.5px solid var(--border-2)", borderRadius: 14,
  padding: "0 16px", fontSize: 30, fontWeight: 700, letterSpacing: 12, textAlign: "center",
  background: "var(--surface)", color: "var(--ink)", outline: "none",
  fontFamily: "monospace", marginBottom: 14, boxSizing: "border-box",
};

export default function DeliveryLogin() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const nav = useNavigate();

  async function checkPhone() {
    if (phone.length !== 10) { setError("Enter 10-digit number"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/auth/check-phone`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await res.json();
      if (!d.data.exists) { setError("No account found for this number. Contact admin."); setLoading(false); return; }
      if (!d.data.hasPin) setStep("setup");
      else setStep("pin");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  async function loginPin() {
    if (pin.length !== 4) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/auth/login-pin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "PIN_EXPIRED") { setStep("setup"); setError("Your PIN has expired. Please set a new one."); return; }
        setError(data.error ?? "Incorrect PIN"); return;
      }
      if (data.data.user.role !== "delivery_staff") {
        setError("This portal is for delivery staff only."); return;
      }
      localStorage.setItem("vdf_delivery_token", data.data.token);
      localStorage.setItem("vdf_delivery_user", JSON.stringify(data.data.user));
      nav("/delivery-app/home");
    } catch { setError("Login failed"); }
    finally { setLoading(false); }
  }

  async function setupPin() {
    if (newPin.length !== 4 || confirmPin.length !== 4) return;
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/auth/setup-pin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: newPin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Setup failed"); return; }
      if (data.data.user.role !== "delivery_staff") {
        setError("This portal is for delivery staff only."); return;
      }
      localStorage.setItem("vdf_delivery_token", data.data.token);
      localStorage.setItem("vdf_delivery_user", JSON.stringify(data.data.user));
      nav("/delivery-app/home");
    } catch { setError("Setup failed"); }
    finally { setLoading(false); }
  }

  async function resetPin() {
    if (newPin.length !== 4 || confirmPin.length !== 4) return;
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/auth/reset-pin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, newPin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
      setSuccess("PIN reset! Please log in with your new PIN.");
      setStep("pin"); setPin(""); setNewPin(""); setConfirmPin("");
    } catch { setError("Reset failed"); }
    finally { setLoading(false); }
  }

  function goBack() { setStep("phone"); setPin(""); setNewPin(""); setConfirmPin(""); setError(""); setSuccess(""); }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--blue)", display: "grid", placeItems: "center", fontSize: 32, marginBottom: 20 }}>🚚</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Delivery Staff Login</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>Varun Dairy Farm · Hyderabad</p>

        {success && (
          <div style={{ background: "var(--green-soft)", border: "1px solid var(--green)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--green-ink)", fontWeight: 600 }}>
            {success}
          </div>
        )}

        {step === "phone" && (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mobile number</label>
            <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: 12, padding: "0 14px", height: 52, marginTop: 6, marginBottom: 14 }}>
              <span style={{ color: "var(--muted)", marginRight: 8, fontSize: 15 }}>+91</span>
              <input value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                placeholder="98XXXXXXXX" autoFocus onKeyDown={e => e.key === "Enter" && checkPhone()}
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 17, fontWeight: 600, letterSpacing: 2, color: "var(--ink)", fontFamily: "inherit" }} />
            </div>
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={checkPhone} disabled={loading || phone.length !== 10}
              style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: phone.length === 10 ? 1 : 0.5 }}>
              {loading ? "Checking…" : "Continue →"}
            </button>
          </>
        )}

        {step === "pin" && (
          <>
            <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>Enter your 4-digit PIN for +91 {phone}</p>
            <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="• • • •" maxLength={4} autoFocus type="password" inputMode="numeric"
              style={pinInputStyle} onKeyDown={e => e.key === "Enter" && loginPin()} />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={loginPin} disabled={loading || pin.length < 4}
              style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: pin.length === 4 ? 1 : 0.5, marginBottom: 10 }}>
              {loading ? "Verifying…" : "Enter Delivery App"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={goBack}
                style={{ flex: 1, height: 40, background: "none", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
                ← Back
              </button>
              <button onClick={() => { setStep("reset"); setNewPin(""); setConfirmPin(""); setError(""); }}
                style={{ flex: 1, height: 40, background: "none", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
                Forgot PIN?
              </button>
            </div>
          </>
        )}

        {step === "setup" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Set your PIN</div>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>Create a 4-digit PIN for +91 {phone}.</p>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>New PIN</div>
            <input value={newPin} onChange={e => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              placeholder="• • • •" maxLength={4} autoFocus type="password" inputMode="numeric" style={pinInputStyle} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Confirm PIN</div>
            <input value={confirmPin} onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              placeholder="• • • •" maxLength={4} type="password" inputMode="numeric" style={pinInputStyle}
              onKeyDown={e => e.key === "Enter" && setupPin()} />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={setupPin} disabled={loading || newPin.length < 4 || confirmPin.length < 4}
              style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: newPin.length === 4 && confirmPin.length === 4 ? 1 : 0.5, marginBottom: 10 }}>
              {loading ? "Setting PIN…" : "Set PIN & Enter"}
            </button>
            <button onClick={goBack}
              style={{ width: "100%", height: 40, background: "none", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
              ← Back
            </button>
          </>
        )}

        {step === "reset" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Reset PIN</div>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>Set a new 4-digit PIN for +91 {phone}.</p>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>New PIN</div>
            <input value={newPin} onChange={e => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              placeholder="• • • •" maxLength={4} autoFocus type="password" inputMode="numeric" style={pinInputStyle} />
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Confirm PIN</div>
            <input value={confirmPin} onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              placeholder="• • • •" maxLength={4} type="password" inputMode="numeric" style={pinInputStyle}
              onKeyDown={e => e.key === "Enter" && resetPin()} />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={resetPin} disabled={loading || newPin.length < 4 || confirmPin.length < 4}
              style={{ width: "100%", height: 52, background: "var(--amber)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: newPin.length === 4 && confirmPin.length === 4 ? 1 : 0.5, marginBottom: 10 }}>
              {loading ? "Resetting…" : "Reset PIN"}
            </button>
            <button onClick={() => { setStep("pin"); setError(""); }}
              style={{ width: "100%", height: 40, background: "none", border: "1px solid var(--border-2)", borderRadius: 10, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
              ← Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
