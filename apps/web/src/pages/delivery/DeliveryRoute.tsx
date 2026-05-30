import { useEffect, useRef, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH() {
  const t = localStorage.getItem("vdf_delivery_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

type Step = "list" | "confirm" | "proof" | "collect" | "done";

export default function DeliveryRoute() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("list");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"wallet" | "upi" | "cash" | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadRoute() {
    const res = await fetch(`${BASE}/delivery/my-route`, { headers: authH() }).then(r => r.json()).catch(() => null);
    if (res?.data) setData(res.data);
    setLoading(false);
  }

  useEffect(() => { loadRoute(); }, []);
  useEffect(() => { if (step === "list") { const t = setInterval(loadRoute, 5000); return () => clearInterval(t); } }, [step]);

  async function startDeliver(order: any) {
    setActiveOrder(order);
    setOtp(["", "", "", ""]); setOtpError(""); setDevOtp(null);
    setPayMethod(null); setProofImage(null);
    const res = await fetch(`${BASE}/delivery/order-otp/${order.id}`, { headers: authH() }).then(r => r.json()).catch(() => null);
    setDevOtp(res?.data?.otp ?? null);
    setStep("confirm");
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = d; setOtp(next);
    if (d && i < 3) {
      const boxes = document.querySelectorAll<HTMLInputElement>(".otp-box");
      boxes[i + 1]?.focus();
    }
  }

  function confirmOtp() {
    const code = otp.join("");
    if (code.length < 4) return;
    if (devOtp && code !== devOtp) { setOtpError("Wrong OTP. Expected: " + devOtp); return; }
    setOtpError("");
    setStep("proof");
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress to max 800px wide, JPEG quality 0.7
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setProofImage(canvas.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  async function saveProofAndContinue() {
    if (proofImage && activeOrder) {
      setUploading(true);
      try {
        await fetch(`${BASE}/delivery/orders/${activeOrder.id}/proof`, {
          method: "POST",
          headers: authH(),
          body: JSON.stringify({ imageBase64: proofImage }),
        });
      } catch { /* non-blocking */ }
      setUploading(false);
    }
    setStep("collect");
  }

  async function markPaid() {
    if (!payMethod || !activeOrder) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE}/orders/${activeOrder.id}/status`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "delivered", paymentMethod: payMethod, collectedAmount: activeOrder.totalAmount }),
      });
      setStep("done");
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setSubmitting(false); }
  }

  function backToList() { setStep("list"); setActiveOrder(null); loadRoute(); }

  const summary = data?.summary ?? { total: 0, done: 0, pending: 0, totalCollection: 0 };
  const orders = data?.orders ?? [];
  const pendingOrders = orders.filter((o: any) => !["delivered", "failed", "cancelled"].includes(o.status));
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_delivery_user") ?? "{}"); } catch { return {}; } })();

  // ── List ────────────────────────────────────────────────────────────────────
  if (step === "list") return (
    <div style={{ padding: 16, paddingBottom: 24 }}>
      {/* Agent hero */}
      <div style={{ background: "var(--blue)", borderRadius: 18, padding: 16, marginBottom: 13, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 23, background: "rgba(255,255,255,0.22)", display: "grid", placeItems: "center", fontWeight: 700 }}>
            {user.name?.slice(0, 2).toUpperCase() ?? "DL"}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{user.name ?? "Delivery Agent"}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{data?.route?.name ?? "Loading route…"} · {data?.route?.area ?? ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ l: "Total", v: summary.total }, { l: "Done", v: summary.done }, { l: "Left", v: summary.pending }].map(s => (
            <div key={s.l} style={{ flex: 1, background: "rgba(255,255,255,0.15)", borderRadius: 11, padding: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "var(--green-soft)", borderRadius: 13, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
        <span style={{ fontSize: 13, color: "var(--green-ink)", fontWeight: 600 }}>💰 Collected today</span>
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--green-ink)", fontFamily: "monospace" }}>₹{summary.totalCollection.toLocaleString("en-IN")}</span>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading route…</div>}
      {!loading && pendingOrders.length === 0 && summary.total === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No orders assigned yet</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Ask admin to assign orders to your route.</div>
        </div>
      )}
      {!loading && pendingOrders.length === 0 && summary.total > 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Route complete!</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>All {summary.total} deliveries done · ₹{summary.totalCollection.toLocaleString("en-IN")} collected</div>
        </div>
      )}

      {pendingOrders.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>PENDING STOPS ({pendingOrders.length})</div>
          {pendingOrders.map((order: any, i: number) => (
            <div key={order.id} style={{ background: "var(--surface)", border: i === 0 ? "2px solid var(--blue)" : "1px solid var(--border)", borderRadius: 16, padding: 14, marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customer?.user?.name ?? "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{order.customer?.address ?? "—"} · {order.customer?.route?.area ?? ""}</div>
                </div>
                <span style={{ background: "var(--blue-soft)", color: "var(--blue-ink)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, height: "fit-content" }}>
                  Stop {order.stopSequence ?? i + 1}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {order.items?.map((item: any) => (
                  <span key={item.id} style={{ background: "var(--surface-2)", borderRadius: 7, padding: "2px 8px", fontSize: 12, color: "var(--muted)" }}>
                    {item.product?.name ?? "Item"} ×{item.quantity}
                  </span>
                ))}
                <span style={{ background: "var(--amber-soft)", color: "var(--amber-ink)", borderRadius: 7, padding: "2px 8px", fontSize: 12 }}>
                  ₹{order.totalAmount.toLocaleString("en-IN")} to collect
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startDeliver(order)}
                  style={{ flex: 1, height: 44, background: i === 0 ? "var(--green)" : "var(--surface-2)", color: i === 0 ? "#fff" : "var(--ink)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  {i === 0 ? "✓ Deliver this stop" : "Deliver"}
                </button>
                <a href={`tel:${order.customer?.user?.phone}`}
                  style={{ width: 44, height: 44, border: "1px solid var(--border-2)", borderRadius: 11, background: "var(--surface)", fontSize: 18, display: "grid", placeItems: "center", textDecoration: "none" }}>📞</a>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // ── OTP Confirm ─────────────────────────────────────────────────────────────
  if (step === "confirm") return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => setStep("list")} style={{ width: 40, height: 40, borderRadius: 11, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 20, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Confirm delivery</div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, textAlign: "center", marginBottom: 13 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--blue-soft)", color: "var(--blue-ink)", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700, margin: "0 auto 8px" }}>
          {activeOrder?.customer?.user?.name?.slice(0, 2).toUpperCase() ?? "?"}
        </div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{activeOrder?.customer?.user?.name ?? "—"}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{activeOrder?.customer?.address ?? "—"}</div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "0 14px", marginBottom: 13 }}>
        {activeOrder?.items?.map((item: any) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{item.product?.name ?? "—"}</span>
            <b>×{item.quantity}</b>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Amount</span>
          <b style={{ fontFamily: "monospace" }}>₹{activeOrder?.totalAmount?.toLocaleString("en-IN")}</b>
        </div>
      </div>

      {devOtp && (
        <div style={{ background: "var(--amber-soft)", border: "1px solid var(--amber)", borderRadius: 10, padding: "10px 14px", marginBottom: 13 }}>
          <span style={{ color: "var(--amber-ink)", fontSize: 13 }}>🔑 OTP: </span>
          <b onClick={() => setOtp(devOtp.split(""))} style={{ fontFamily: "monospace", fontSize: 20, letterSpacing: 4, color: "var(--amber-ink)", cursor: "pointer" }}>{devOtp}</b>
          <span style={{ color: "var(--amber-ink)", fontSize: 11, marginLeft: 8 }}>(click to fill)</span>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, textAlign: "center", marginBottom: 10 }}>ENTER OTP FROM CUSTOMER</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 14 }}>
        {otp.map((d, i) => (
          <input key={i} className="otp-box" value={d} onChange={e => setDigit(i, e.target.value)} maxLength={1}
            onKeyDown={e => { if (e.key === "Backspace" && !d && i > 0) { const boxes = document.querySelectorAll<HTMLInputElement>(".otp-box"); boxes[i - 1]?.focus(); } }}
            style={{ width: 56, height: 66, textAlign: "center", fontSize: 26, fontWeight: 700, border: `1.5px solid ${d ? "var(--blue)" : "var(--border-2)"}`, borderRadius: 12, background: d ? "var(--surface)" : "var(--surface-2)", color: "var(--ink)", outline: "none", fontFamily: "monospace" }} />
        ))}
      </div>
      {otpError && <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center", marginBottom: 10 }}>{otpError}</p>}
      <button onClick={confirmOtp} disabled={otp.join("").length < 4}
        style={{ width: "100%", height: 52, background: "var(--green)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: otp.join("").length === 4 ? 1 : 0.5 }}>
        ✓ OTP verified — next
      </button>
    </div>
  );

  // ── Photo proof ─────────────────────────────────────────────────────────────
  if (step === "proof") return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => setStep("confirm")} style={{ width: 40, height: 40, borderRadius: 11, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 20, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Delivery proof</div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{activeOrder?.customer?.user?.name}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{activeOrder?.customer?.address}</div>
      </div>

      {/* Photo capture */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhoto} />

      {proofImage ? (
        <div style={{ marginBottom: 16 }}>
          <img src={proofImage} alt="proof" style={{ width: "100%", borderRadius: 14, maxHeight: 280, objectFit: "cover" }} />
          <button onClick={() => { setProofImage(null); fileRef.current?.click(); }}
            style={{ marginTop: 10, width: "100%", height: 40, border: "1px solid var(--border-2)", borderRadius: 11, background: "var(--surface)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            📷 Retake photo
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          style={{ width: "100%", height: 120, border: "2px dashed var(--border-2)", borderRadius: 16, background: "var(--surface-2)", fontSize: 14, color: "var(--muted)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 36 }}>📷</span>
          <span style={{ fontWeight: 600 }}>Take delivery photo</span>
          <span style={{ fontSize: 12 }}>Optional but recommended</span>
        </button>
      )}

      <button onClick={saveProofAndContinue} disabled={uploading}
        style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        {uploading ? "Uploading…" : proofImage ? "Save proof & collect payment →" : "Skip & collect payment →"}
      </button>
    </div>
  );

  // ── Payment ─────────────────────────────────────────────────────────────────
  if (step === "collect") return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => setStep("proof")} style={{ width: 40, height: 40, borderRadius: 11, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 20, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Collect payment</div>
      </div>
      <div style={{ background: "var(--green)", borderRadius: 18, padding: 20, textAlign: "center", marginBottom: 20, color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Amount due</div>
        <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "monospace" }}>₹{activeOrder?.totalAmount?.toLocaleString("en-IN")}</div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{activeOrder?.customer?.user?.name}</div>
        {proofImage && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>📷 Proof captured</div>}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>SELECT PAYMENT METHOD</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {([{ key: "upi", icon: "📲", label: "UPI / QR" }, { key: "cash", icon: "💵", label: "Cash" }, { key: "wallet", icon: "👝", label: "Wallet" }] as const).map(m => (
          <button key={m.key} onClick={() => setPayMethod(m.key)}
            style={{ flex: 1, background: payMethod === m.key ? "var(--blue-soft)" : "var(--surface)", border: `1.5px solid ${payMethod === m.key ? "var(--blue)" : "var(--border)"}`, borderRadius: 14, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <span style={{ fontSize: 28 }}>{m.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: payMethod === m.key ? "var(--blue-ink)" : "var(--muted)" }}>{m.label}</span>
          </button>
        ))}
      </div>
      <button onClick={markPaid} disabled={!payMethod || submitting}
        style={{ width: "100%", height: 54, background: "var(--green)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: payMethod ? 1 : 0.5 }}>
        {submitting ? "Saving…" : "✓ Mark paid & delivered"}
      </button>
    </div>
  );

  // ── Done ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, minHeight: 400 }}>
      <div style={{ width: 96, height: 96, borderRadius: 48, background: "var(--green-soft)", display: "grid", placeItems: "center", fontSize: 48, marginBottom: 20 }}>✓</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Delivered &amp; synced!</div>
      <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", maxWidth: 260, lineHeight: 1.5, marginBottom: 6 }}>
        Customer notified · ₹{activeOrder?.totalAmount?.toLocaleString("en-IN")} recorded
        {proofImage ? " · Photo saved" : ""}
      </div>
      <button onClick={backToList}
        style={{ marginTop: 24, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        Next stop →
      </button>
    </div>
  );
}
