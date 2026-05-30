import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import DeliveryRoute from "./DeliveryRoute";
import DeliveryCollect from "./DeliveryCollect";

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
    { to: "/delivery-app/route", icon: "ti-route", label: "Route" },
    { to: "/delivery-app/collect", icon: "ti-cash", label: "Collect" },
    { to: "/delivery-app/profile", icon: "ti-user", label: "Me" },
  ];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative" }}>
      {/* Phone frame header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600 }}>
        <span style={{ fontFamily: "monospace" }}>9:41</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Varun Dairy · Delivery</span>
        <span style={{ display: "flex", gap: 6, fontSize: 14 }}>📶 🔋</span>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Routes>
          <Route index element={<Navigate to="route" replace />} />
          <Route path="route" element={<DeliveryRoute />} />
          <Route path="collect" element={<DeliveryCollect />} />
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

  async function checkIn() {
    setWorking(true);
    const gps = await getGPS();
    await fetch(`${BASE}/delivery/attendance/check-in`, {
      method: "POST", headers: authH(), body: JSON.stringify(gps),
    });
    loadAttendance();
    setWorking(false);
  }

  async function checkOut() {
    setWorking(true);
    const gps = await getGPS();
    await fetch(`${BASE}/delivery/attendance/check-out`, {
      method: "POST", headers: authH(), body: JSON.stringify(gps),
    });
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
        <div style={{ fontSize: 19, fontWeight: 700 }}>{user.name}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{user.phone} · Delivery staff</div>
      </div>

      {/* Attendance card */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Today's attendance</div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 12 }}>Loading…</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {/* Check-in */}
              <div style={{ flex: 1, background: checkedIn ? "var(--green-soft)" : "var(--surface-2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: checkedIn ? "var(--green-ink)" : "var(--muted)", fontWeight: 700, marginBottom: 4 }}>CHECK-IN</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: checkedIn ? "var(--green-ink)" : "var(--faint)", fontFamily: "monospace" }}>
                  {checkedIn ? fmt(attendance.checkIn) : "—"}
                </div>
                {attendance?.checkInLat && (
                  <div style={{ fontSize: 10, color: "var(--green-ink)", marginTop: 3 }}>📍 GPS recorded</div>
                )}
              </div>
              {/* Check-out */}
              <div style={{ flex: 1, background: checkedOut ? "var(--blue-soft)" : "var(--surface-2)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: checkedOut ? "var(--blue-ink)" : "var(--muted)", fontWeight: 700, marginBottom: 4 }}>CHECK-OUT</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: checkedOut ? "var(--blue-ink)" : "var(--faint)", fontFamily: "monospace" }}>
                  {checkedOut ? fmt(attendance.checkOut) : "—"}
                </div>
                {attendance?.checkOutLat && (
                  <div style={{ fontSize: 10, color: "var(--blue-ink)", marginTop: 3 }}>📍 GPS recorded</div>
                )}
              </div>
            </div>

            {duration && (
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>⏱ {duration}</div>
            )}

            {/* Action button */}
            {!checkedIn && (
              <button onClick={checkIn} disabled={working}
                style={{ width: "100%", height: 48, background: "var(--green)", color: "#fff", border: "none", borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {working ? "Getting GPS…" : "✓ Check in"}
              </button>
            )}
            {checkedIn && !checkedOut && (
              <button onClick={checkOut} disabled={working}
                style={{ width: "100%", height: 48, background: "var(--blue)", color: "#fff", border: "none", borderRadius: 13, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {working ? "Getting GPS…" : "⏹ Check out"}
              </button>
            )}
            {checkedIn && checkedOut && (
              <div style={{ textAlign: "center", fontSize: 14, color: "var(--green-ink)", fontWeight: 600 }}>
                ✓ Day complete
              </div>
            )}
          </>
        )}
      </div>

      {/* Sign out */}
      <button onClick={() => { localStorage.removeItem("vdf_delivery_token"); localStorage.removeItem("vdf_delivery_user"); nav("/delivery-login"); }}
        style={{ width: "100%", background: "var(--red-soft)", color: "var(--red-ink)", border: "none", borderRadius: 13, padding: "14px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Sign out
      </button>
    </div>
  );
}
