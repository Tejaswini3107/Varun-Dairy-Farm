import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import DeliveryRoute from "./DeliveryRoute";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
function authH() {
  const t = localStorage.getItem("vdf_delivery_token");
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export default function DeliveryApp() {
  const nav = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_delivery_user") ?? "null"); } catch { return null; } })();

  useEffect(() => {
    if (!user || user.role !== "delivery_staff") nav("/delivery-login");
  }, []);

  if (!user) return null;

  const tabs = [
    { to: "/delivery-app/home", icon: "ti-home", label: "Home" },
    { to: "/delivery-app/route", icon: "ti-route", label: "Route" },
    { to: "/delivery-app/profile", icon: "ti-user", label: "Me" },
  ];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative" }}>
      {/* Status bar */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600 }}>
        <span style={{ fontFamily: "monospace" }}>9:41</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Varun Dairy · Delivery</span>
        <span style={{ display: "flex", gap: 6, fontSize: 14 }}>📶 🔋</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<DeliveryHome user={user} />} />
          <Route path="route" element={<DeliveryRoute />} />
          <Route path="profile" element={<DeliveryProfile user={user} />} />
        </Routes>
      </div>

      {/* Bottom nav */}
      <div style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-around", padding: "10px 6px 16px" }}>
        {tabs.map(t => (
          <NavLink key={t.to} to={t.to}
            style={({ isActive }) => ({ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: isActive ? "var(--blue)" : "var(--faint)", textDecoration: "none", padding: "4px 16px", borderRadius: 10 })}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 22 }} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────

function DeliveryHome({ user }: { user: any }) {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch(`${BASE}/delivery/my-route`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.data) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const summary = data?.summary ?? { total: 0, done: 0, pending: 0, totalCollection: 0 };
  const orders: any[] = data?.orders ?? [];
  const pendingOrders = orders.filter(o => !["delivered", "failed", "cancelled"].includes(o.status));
  const pendingCollection = pendingOrders.reduce((s: number, o: any) => s + (o.totalAmount ?? 0), 0);
  const routeComplete = !loading && summary.total > 0 && summary.pending === 0;

  async function startRoute() {
    if (data?.route?.id) {
      fetch(`${BASE}/delivery/routes/${data.route.id}/start`, { method: "PATCH", headers: authH() }).catch(() => {});
    }
    nav("/delivery-app/route");
  }

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20, paddingTop: 6 }}>
        <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>Good morning,</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{user.name ?? "—"}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
          {data?.route?.name ?? (loading ? "Loading…" : "No route assigned")}{data?.route?.area ? ` · ${data.route.area}` : ""}
        </div>
      </div>

      {/* Today's work card */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 22, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>TODAY'S WORK</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Total Stops", value: summary.total, color: "var(--ink)" },
            { label: "Completed", value: summary.done, color: "var(--green-ink)" },
            { label: "Pending", value: summary.pending, color: "var(--blue-ink)" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface-2)", borderRadius: 14, padding: "14px 0", textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "var(--green-soft)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--green-ink)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 5 }}>CASH COLLECTION</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "var(--green-ink)" }}>
              ₹{loading ? "—" : summary.totalCollection.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ background: "var(--amber-soft)", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--amber-ink)", fontWeight: 700, letterSpacing: 0.5, marginBottom: 5 }}>PENDING COLLECTION</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "var(--amber-ink)" }}>
              ₹{loading ? "—" : pendingCollection.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      {/* CTA or end of day */}
      {!routeComplete ? (
        <button onClick={startRoute}
          style={{ width: "100%", height: 68, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 22, fontSize: 24, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5 }}>
          START ROUTE →
        </button>
      ) : (
        <EndOfDaySummary data={data} />
      )}
    </div>
  );
}

// ── END OF DAY SUMMARY ────────────────────────────────────────────────────────

function EndOfDaySummary({ data }: { data: any }) {
  const nav = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const orders: any[] = data?.orders ?? [];
  const delivered = orders.filter(o => o.status === "delivered");
  const failed = orders.filter(o => o.status === "failed");
  const cashAmt = delivered.filter(o => o.paymentMethod === "cash").reduce((s: number, o: any) => s + (o.collectedAmount ?? 0), 0);
  const upiAmt = delivered.filter(o => o.paymentMethod === "upi").reduce((s: number, o: any) => s + (o.collectedAmount ?? 0), 0);
  const pendingCount = delivered.filter(o => o.paymentStatus === "pending" || (o.collectedAmount ?? 0) === 0).length;
  const pct = (data?.summary?.total ?? 0) > 0
    ? Math.round((data.summary.done / data.summary.total) * 100)
    : 0;

  async function submitReport() {
    setSubmitting(true);
    try {
      const gps = await getGPS();
      await fetch(`${BASE}/delivery/attendance/check-out`, {
        method: "POST", headers: authH(), body: JSON.stringify(gps),
      });
    } catch { /* best-effort */ }
    setSubmitted(true);
    setSubmitting(false);
  }

  const rows = [
    { label: "Customers Assigned", value: data?.summary?.total ?? 0 },
    { label: "Customers Delivered", value: delivered.length },
    { label: "Failed Deliveries", value: failed.length },
    { label: "Cash Collected", value: `₹${cashAmt.toLocaleString("en-IN")}` },
    { label: "UPI Collected", value: `₹${upiAmt.toLocaleString("en-IN")}` },
    { label: "Pending Collections", value: pendingCount },
    { label: "Route Completion", value: `${pct}%` },
  ];

  return (
    <div style={{ background: "var(--green-soft)", border: "2px solid var(--green)", borderRadius: 22, padding: 18 }}>
      <div style={{ fontSize: 13, color: "var(--green-ink)", fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>END OF DAY SUMMARY</div>
      {rows.map((row, i) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none" }}>
          <span style={{ fontSize: 15, color: "var(--green-ink)", fontWeight: 600 }}>{row.label}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--green-ink)", fontFamily: "monospace" }}>{row.value}</span>
        </div>
      ))}
      <button
        onClick={submitted ? undefined : submitReport}
        disabled={submitting}
        style={{ width: "100%", height: 58, background: submitted ? "rgba(0,0,0,0.12)" : "var(--green)", color: "#fff", border: "none", borderRadius: 16, fontSize: 18, fontWeight: 800, cursor: submitted ? "default" : "pointer", marginTop: 16 }}>
        {submitting ? "Submitting…" : submitted ? "✓ Day Report Submitted" : "SUBMIT DAY REPORT"}
      </button>
    </div>
  );
}

async function getGPS(): Promise<{ lat?: number; lng?: number }> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve({}); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve({}),
      { timeout: 5000 }
    );
  });
}

// ── PROFILE ───────────────────────────────────────────────────────────────────

function DeliveryProfile({ user }: { user: any }) {
  const nav = useNavigate();
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  function loadAttendance() {
    fetch(`${BASE}/delivery/attendance/today`, { headers: authH() })
      .then(r => r.json()).then(d => setAttendance(d.data)).catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAttendance(); }, []);

  async function checkIn() {
    setWorking(true);
    const gps = await getGPS();
    await fetch(`${BASE}/delivery/attendance/check-in`, { method: "POST", headers: authH(), body: JSON.stringify(gps) });
    loadAttendance();
    setWorking(false);
  }

  async function checkOut() {
    setWorking(true);
    const gps = await getGPS();
    await fetch(`${BASE}/delivery/attendance/check-out`, { method: "POST", headers: authH(), body: JSON.stringify(gps) });
    loadAttendance();
    setWorking(false);
  }

  function fmt(dt: string) {
    return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  const checkedIn = !!attendance?.checkIn;
  const checkedOut = !!attendance?.checkOut;

  let duration = "";
  if (attendance?.checkIn && attendance?.checkOut) {
    const mins = Math.round((new Date(attendance.checkOut).getTime() - new Date(attendance.checkIn).getTime()) / 60000);
    duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
  } else if (attendance?.checkIn) {
    const mins = Math.round((Date.now() - new Date(attendance.checkIn).getTime()) / 60000);
    duration = `${Math.floor(mins / 60)}h ${mins % 60}m on duty`;
  }

  return (
    <div style={{ padding: 16, paddingBottom: 32 }}>
      {/* Agent card */}
      <div style={{ textAlign: "center", paddingTop: 20, marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: 36, background: "var(--blue-soft)", color: "var(--blue-ink)", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700, margin: "0 auto 10px" }}>
          {user.name?.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{user.phone} · Delivery staff</div>
      </div>

      {/* Attendance card */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Today's attendance</div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 12 }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, background: checkedIn ? "var(--green-soft)" : "var(--surface-2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: checkedIn ? "var(--green-ink)" : "var(--muted)", fontWeight: 700, marginBottom: 4 }}>CHECK-IN</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: checkedIn ? "var(--green-ink)" : "var(--faint)", fontFamily: "monospace" }}>
                  {checkedIn ? fmt(attendance.checkIn) : "—"}
                </div>
                {attendance?.checkInLat && <div style={{ fontSize: 10, color: "var(--green-ink)", marginTop: 3 }}>📍 GPS recorded</div>}
              </div>
              <div style={{ flex: 1, background: checkedOut ? "var(--blue-soft)" : "var(--surface-2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: checkedOut ? "var(--blue-ink)" : "var(--muted)", fontWeight: 700, marginBottom: 4 }}>CHECK-OUT</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: checkedOut ? "var(--blue-ink)" : "var(--faint)", fontFamily: "monospace" }}>
                  {checkedOut ? fmt(attendance.checkOut) : "—"}
                </div>
                {attendance?.checkOutLat && <div style={{ fontSize: 10, color: "var(--blue-ink)", marginTop: 3 }}>📍 GPS recorded</div>}
              </div>
            </div>

            {duration && <div style={{ textAlign: "center", fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>⏱ {duration}</div>}

            {!checkedIn && (
              <button onClick={checkIn} disabled={working}
                style={{ width: "100%", height: 52, background: "var(--green)", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                {working ? "Getting GPS…" : "✓ Check in"}
              </button>
            )}
            {checkedIn && !checkedOut && (
              <button onClick={checkOut} disabled={working}
                style={{ width: "100%", height: 52, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                {working ? "Getting GPS…" : "⏹ Check out"}
              </button>
            )}
            {checkedIn && checkedOut && (
              <div style={{ textAlign: "center", fontSize: 15, color: "var(--green-ink)", fontWeight: 700 }}>✓ Day complete</div>
            )}
          </>
        )}
      </div>

      {/* Sign out */}
      <button onClick={() => { localStorage.removeItem("vdf_delivery_token"); localStorage.removeItem("vdf_delivery_user"); nav("/delivery-login"); }}
        style={{ width: "100%", background: "var(--red-soft)", color: "var(--red-ink)", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
        Sign out
      </button>
    </div>
  );
}
