import { useEffect, useRef, useState } from "react";

const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
function authH() {
  const t = localStorage.getItem("vdf_delivery_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

function postLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    p => {
      fetch(`${BASE}/delivery/agent-location`, {
        method: "POST", headers: authH(),
        body: JSON.stringify({ lat: p.coords.latitude, lng: p.coords.longitude }),
      }).catch(() => {});
    },
    () => {},
    { timeout: 5000, maximumAge: 30000 },
  );
}

type Step = "list" | "load" | "card" | "fail" | "collect" | "done";

const FAIL_REASONS = [
  "House Locked",
  "Customer Requested Skip",
  "Wrong Address",
  "Product Refused",
];

const btn = (extra: React.CSSProperties): React.CSSProperties => ({
  border: "none", borderRadius: 18, fontWeight: 800, cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center", width: "100%", ...extra,
});

export default function DeliveryRoute() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("list");
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPartial, setShowPartial] = useState(false);
  const [partialAmt, setPartialAmt] = useState("");
  const [partialMethod, setPartialMethod] = useState<"cash" | "upi" | null>(null);

  // swipe state per card (indexed by orderId)
  const swipeStart = useRef<number | null>(null);

  async function loadRoute() {
    const res = await fetch(`${BASE}/delivery/my-route`, { headers: authH() }).then(r => r.json()).catch(() => null);
    if (res?.data) setData(res.data);
    setLoading(false);
  }

  useEffect(() => { loadRoute(); postLocation(); }, []);
  useEffect(() => {
    if (step === "list") {
      const t = setInterval(() => { loadRoute(); postLocation(); }, 30000);
      return () => clearInterval(t);
    }
  }, [step]);

  function openCard(order: any) {
    setActiveOrder(order);
    setSubmitting(false);
    setShowPartial(false);
    setPartialAmt("");
    setPartialMethod(null);
    setStep("card");
  }

  function openCollect(order: any) {
    setActiveOrder(order);
    setSubmitting(false);
    setShowPartial(false);
    setPartialAmt("");
    setPartialMethod(null);
    setStep("collect");
  }

  function openFail(order: any) {
    setActiveOrder(order);
    setSubmitting(false);
    setStep("fail");
  }

  async function markDelivered(method: "upi" | "cash" | "wallet", amount?: number) {
    if (!activeOrder) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE}/orders/${activeOrder.id}/status`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({
          status: "delivered",
          paymentMethod: method,
          collectedAmount: amount ?? activeOrder.totalAmount,
        }),
      });
      setStep("done");
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setSubmitting(false); }
  }

  async function markFailed(reason: string) {
    if (!activeOrder) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE}/orders/${activeOrder.id}/status`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "failed" }),
      });
      backToList();
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setSubmitting(false); }
  }

  async function markUnpaid() {
    if (!activeOrder) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE}/orders/${activeOrder.id}/status`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "delivered", paymentMethod: "cash", collectedAmount: 0 }),
      });
      setStep("done");
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setSubmitting(false); }
  }

  function backToList() {
    setStep("list");
    setActiveOrder(null);
    loadRoute();
  }

  const summary = data?.summary ?? { total: 0, done: 0, pending: 0, totalCollection: 0 };
  const orders: any[] = data?.orders ?? [];
  const pendingOrders = orders
    .filter(o => !["delivered", "failed", "cancelled"].includes(o.status))
    .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0));

  const doneOrders = orders
    .filter(o => ["delivered", "failed", "cancelled"].includes(o.status))
    .sort((a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0));

  // aggregate product totals across all orders for load check
  const loadTotals: Record<string, { qty: number; unit: string }> = {};
  orders.forEach(o => {
    o.items?.forEach((item: any) => {
      const name = item.product?.name ?? "Unknown";
      const unit = item.product?.unit ?? "";
      if (!loadTotals[name]) loadTotals[name] = { qty: 0, unit };
      loadTotals[name].qty += item.quantity;
    });
  });

  // ── TODAY'S LOAD ──────────────────────────────────────────────────────────
  if (step === "load") return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button onClick={() => setStep("list")}
          style={{ width: 46, height: 46, borderRadius: 13, border: "1.5px solid var(--border-2)", background: "var(--surface)", fontSize: 22, cursor: "pointer", display: "grid", placeItems: "center" }}>
          ←
        </button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>TODAY'S LOAD</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Verify before starting route</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {Object.entries(loadTotals).map(([name, { qty, unit }]) => (
          <div key={name} style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 18, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{name}</div>
              {unit && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{unit}</div>}
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, fontFamily: "monospace", color: "var(--blue-ink)" }}>{qty}</div>
          </div>
        ))}
        {Object.keys(loadTotals).length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 16 }}>No items found</div>
        )}
      </div>

      <button onClick={() => setStep("list")} style={btn({ height: 60, background: "var(--green)", color: "#fff", fontSize: 19 })}>
        LOOKS GOOD — START ROUTE
      </button>
    </div>
  );

  // ── STOP LIST ─────────────────────────────────────────────────────────────
  if (step === "list") return (
    <div style={{ padding: 16, paddingBottom: 24 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, letterSpacing: 1 }}>TODAY'S ROUTE</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{data?.route?.name ?? "Loading…"}{data?.route?.area ? ` · ${data.route.area}` : ""}</div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "TOTAL", value: summary.total, color: "var(--ink)" },
          { label: "DONE", value: summary.done, color: "var(--green-ink)" },
          { label: "LEFT", value: summary.pending, color: "var(--blue-ink)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Collection strip */}
      <div style={{ background: "var(--green-soft)", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: "var(--green-ink)", fontWeight: 700 }}>Cash Collected</span>
        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "var(--green-ink)" }}>
          ₹{summary.totalCollection.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Load check */}
      <button onClick={() => setStep("load")}
        style={{ width: "100%", height: 44, background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: 13, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 18, color: "var(--ink)" }}>
        📦 Check Today's Load
      </button>

      {/* Hint */}
      {pendingOrders.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginBottom: 10 }}>
          Swipe → Delivered &nbsp;·&nbsp; Swipe ← Not Available &nbsp;·&nbsp; Tap to open
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--muted)", fontSize: 16 }}>Loading route…</div>}

      {!loading && orders.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>No orders assigned yet</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8 }}>Ask admin to assign your route.</div>
        </div>
      )}

      {/* Pending stops */}
      {pendingOrders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: 1 }}>
            PENDING — {pendingOrders.length} STOPS
          </div>
          {pendingOrders.map((order: any, i: number) => {
            const isNext = i === 0;
            return (
              <div
                key={order.id}
                onTouchStart={e => { swipeStart.current = e.touches[0].clientX; }}
                onTouchEnd={e => {
                  const dx = e.changedTouches[0].clientX - (swipeStart.current ?? 0);
                  if (dx > 80) openCollect(order);
                  else if (dx < -80) openFail(order);
                  swipeStart.current = null;
                }}
                onClick={() => openCard(order)}
                style={{
                  background: isNext ? "var(--blue)" : "var(--surface)",
                  border: isNext ? "none" : "1.5px solid var(--border)",
                  borderRadius: 20, padding: "16px 18px", cursor: "pointer",
                  userSelect: "none", touchAction: "pan-y",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: isNext ? "#fff" : "var(--ink)" }}>
                      {order.customer?.user?.name ?? "—"}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 3, color: isNext ? "rgba(255,255,255,0.8)" : "var(--muted)" }}>
                      {order.customer?.address ?? "—"}
                    </div>
                  </div>
                  <span style={{
                    background: isNext ? "rgba(255,255,255,0.25)" : "var(--blue-soft)",
                    color: isNext ? "#fff" : "var(--blue-ink)",
                    borderRadius: 20, padding: "5px 13px", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap",
                  }}>
                    #{order.stopSequence ?? i + 1}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {order.items?.map((item: any) => (
                    <span key={item.id} style={{
                      background: isNext ? "rgba(255,255,255,0.2)" : "var(--surface-2)",
                      color: isNext ? "#fff" : "var(--muted)",
                      borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 600,
                    }}>
                      {item.product?.name ?? "Item"} ×{item.quantity}
                    </span>
                  ))}
                  {order.totalAmount > 0 && (
                    <span style={{
                      background: isNext ? "rgba(255,255,255,0.2)" : "var(--amber-soft)",
                      color: isNext ? "#fff" : "var(--amber-ink)",
                      borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700,
                    }}>
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed / failed stops */}
      {doneOrders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: 1 }}>
            COMPLETED — {doneOrders.length} STOPS
          </div>
          {doneOrders.map((order: any, i: number) => {
            const delivered = order.status === "delivered";
            const failed = order.status === "failed";
            return (
              <div key={order.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 18, padding: "12px 16px", opacity: 0.75,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
                      {order.customer?.user?.name ?? "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span>#{order.stopSequence ?? i + 1}</span>
                      {order.deliveredAt && (
                        <span>{new Date(order.deliveredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                      {delivered && order.collectedAmount > 0 && (
                        <span style={{ color: "var(--green-ink)", fontWeight: 700 }}>₹{order.collectedAmount.toLocaleString("en-IN")} collected</span>
                      )}
                      {delivered && (order.collectedAmount ?? 0) === 0 && (
                        <span style={{ color: "var(--amber-ink)", fontWeight: 700 }}>Unpaid</span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    background: delivered ? "var(--green-soft)" : "var(--red-soft)",
                    color: delivered ? "var(--green-ink)" : "var(--red-ink)",
                    borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", marginLeft: 10,
                  }}>
                    {delivered ? "✓ Done" : "✗ Failed"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── DELIVERY CARD ─────────────────────────────────────────────────────────
  if (step === "card") {
    const customerPhone = activeOrder?.customer?.user?.phone ?? "";
    const addr = activeOrder?.customer?.address ?? "";
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr + " " + (activeOrder?.customer?.route?.area ?? ""))}`;

    return (
      <div style={{ padding: 16, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setStep("list")}
            style={{ width: 46, height: 46, borderRadius: 13, border: "1.5px solid var(--border-2)", background: "var(--surface)", fontSize: 22, cursor: "pointer", display: "grid", placeItems: "center" }}>
            ←
          </button>
          <span style={{ background: "var(--blue-soft)", color: "var(--blue-ink)", borderRadius: 20, padding: "6px 16px", fontSize: 15, fontWeight: 800 }}>
            STOP #{activeOrder?.stopSequence ?? "—"}
          </span>
        </div>

        {/* Customer */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{activeOrder?.customer?.user?.name ?? "—"}</div>
          <div style={{ fontSize: 15, color: "var(--muted)", marginBottom: 3 }}>{addr || "—"}</div>
          <div style={{ fontSize: 15, color: "var(--muted)" }}>{customerPhone}</div>
        </div>

        {/* Products */}
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>PRODUCTS TO DELIVER</div>
          {activeOrder?.items?.map((item: any) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 19, fontWeight: 700 }}>{item.product?.name ?? "—"}</span>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "var(--blue-ink)" }}>×{item.quantity}</span>
            </div>
          ))}
          {activeOrder?.notes && (
            <div style={{ marginTop: 4, padding: "10px 14px", background: "var(--amber-soft)", borderRadius: 12, fontSize: 14, color: "var(--amber-ink)", fontWeight: 600 }}>
              📝 {activeOrder.notes}
            </div>
          )}
        </div>

        {/* Collection due */}
        {activeOrder?.totalAmount > 0 && (
          <div style={{ background: "var(--amber-soft)", border: "1.5px solid var(--amber)", borderRadius: 20, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--amber-ink)" }}>Collection Due</span>
            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: "var(--amber-ink)" }}>
              ₹{activeOrder.totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {/* Primary action */}
        <button onClick={() => setStep("collect")} disabled={submitting}
          style={btn({ height: 66, background: "var(--green)", color: "#fff", fontSize: 22, letterSpacing: 0.5 })}>
          DELIVERED
        </button>

        <button onClick={() => setStep("fail")} disabled={submitting}
          style={btn({ height: 56, background: "var(--red-soft)", color: "var(--red-ink)", border: "2px solid var(--red)", fontSize: 18 })}>
          NOT AVAILABLE
        </button>

        {/* Call + Map */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <a href={`tel:${customerPhone}`}
            style={{ height: 56, background: "var(--blue-soft)", color: "var(--blue-ink)", border: "2px solid var(--blue)", borderRadius: 18, fontSize: 18, fontWeight: 800, display: "grid", placeItems: "center", textDecoration: "none" }}>
            CALL
          </a>
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            style={{ height: 56, background: "var(--surface)", color: "var(--ink)", border: "1.5px solid var(--border-2)", borderRadius: 18, fontSize: 18, fontWeight: 800, display: "grid", placeItems: "center", textDecoration: "none" }}>
            MAP
          </a>
        </div>
      </div>
    );
  }

  // ── FAILED DELIVERY ───────────────────────────────────────────────────────
  if (step === "fail") return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button onClick={() => setStep(activeOrder ? "card" : "list")}
          style={{ width: 46, height: 46, borderRadius: 13, border: "1.5px solid var(--border-2)", background: "var(--surface)", fontSize: 22, cursor: "pointer", display: "grid", placeItems: "center" }}>
          ←
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>NOT AVAILABLE</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>{activeOrder?.customer?.user?.name ?? "—"}</div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.5, marginBottom: 14 }}>SELECT REASON</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {FAIL_REASONS.map(reason => (
          <button key={reason} onClick={() => markFailed(reason)} disabled={submitting}
            style={{ height: 64, background: "var(--surface)", border: "1.5px solid var(--border-2)", borderRadius: 18, fontSize: 18, fontWeight: 700, cursor: "pointer", color: "var(--ink)", textAlign: "left", padding: "0 22px" }}>
            {reason}
          </button>
        ))}
      </div>
    </div>
  );

  // ── COLLECT PAYMENT ───────────────────────────────────────────────────────
  if (step === "collect") return (
    <div style={{ padding: 16, paddingBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setStep(activeOrder ? "card" : "list")}
          style={{ width: 46, height: 46, borderRadius: 13, border: "1.5px solid var(--border-2)", background: "var(--surface)", fontSize: 22, cursor: "pointer", display: "grid", placeItems: "center" }}>
          ←
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>COLLECT PAYMENT</div>
          <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>{activeOrder?.customer?.user?.name ?? "—"}</div>
        </div>
      </div>

      {/* Outstanding amount */}
      <div style={{ background: "var(--green)", borderRadius: 22, padding: "26px 20px", textAlign: "center", marginBottom: 22, color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>OUTSTANDING</div>
        <div style={{ fontSize: 52, fontWeight: 800, fontFamily: "monospace", letterSpacing: 1 }}>
          ₹{activeOrder?.totalAmount?.toLocaleString("en-IN") ?? "0"}
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>{activeOrder?.customer?.user?.name}</div>
      </div>

      {/* Cash / UPI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {([
          { key: "cash" as const, icon: "💵", label: "CASH" },
          { key: "upi" as const, icon: "📲", label: "UPI" },
        ]).map(m => (
          <button key={m.key} onClick={() => markDelivered(m.key)} disabled={submitting}
            style={{ height: 86, background: "var(--surface)", border: "2px solid var(--border-2)", borderRadius: 20, fontSize: 17, fontWeight: 800, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, color: "var(--ink)" }}>
            <span style={{ fontSize: 30 }}>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Partial payment */}
      {!showPartial ? (
        <button onClick={() => setShowPartial(true)}
          style={btn({ height: 54, background: "var(--surface)", border: "1.5px solid var(--border-2)", fontSize: 17, color: "var(--ink)", marginBottom: 10 })}>
          PARTIAL PAYMENT
        </button>
      ) : (
        <div style={{ marginBottom: 10 }}>
          <input
            type="number" value={partialAmt} onChange={e => setPartialAmt(e.target.value)}
            placeholder="Enter amount" inputMode="numeric"
            style={{ width: "100%", height: 56, border: "1.5px solid var(--border-2)", borderRadius: 14, padding: "0 18px", fontSize: 24, fontWeight: 700, fontFamily: "monospace", background: "var(--surface)", color: "var(--ink)", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
          />
          {parseFloat(partialAmt) > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                { key: "cash" as const, label: "CASH" },
                { key: "upi" as const, label: "UPI" },
              ]).map(m => (
                <button key={m.key} onClick={() => markDelivered(m.key, parseFloat(partialAmt))} disabled={submitting}
                  style={btn({ height: 52, background: "var(--blue)", color: "#fff", fontSize: 16, borderRadius: 14 })}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button onClick={markUnpaid} disabled={submitting}
        style={btn({ height: 54, background: "var(--red-soft)", color: "var(--red-ink)", border: "2px solid var(--red)", fontSize: 17 })}>
        MARK UNPAID
      </button>
    </div>
  );

  // ── DONE ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, minHeight: 400, gap: 16 }}>
      <div style={{ width: 104, height: 104, borderRadius: 52, background: "var(--green-soft)", display: "grid", placeItems: "center", fontSize: 52 }}>✓</div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>Delivered!</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {["Admin Portal Updated", "Customer App Updated", "Billing Updated"].map(line => (
          <div key={line} style={{ fontSize: 15, color: "var(--green-ink)", fontWeight: 600 }}>✓ {line}</div>
        ))}
      </div>
      <button onClick={backToList}
        style={btn({ marginTop: 10, height: 66, background: "var(--blue)", color: "#fff", fontSize: 22 })}>
        NEXT STOP →
      </button>
    </div>
  );
}
