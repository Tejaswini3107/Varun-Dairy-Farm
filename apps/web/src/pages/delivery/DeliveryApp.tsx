import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import DeliveryRoute from "./DeliveryRoute";
import DeliveryCollect from "./DeliveryCollect";

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
  return (
    <div style={{ padding: 20, textAlign: "center", paddingTop: 60 }}>
      <div style={{ width: 80, height: 80, borderRadius: 40, background: "var(--blue-soft)", color: "var(--blue-ink)", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 700, margin: "0 auto 14px" }}>
        {user.name?.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{user.name}</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 28 }}>{user.phone}</div>
      <button onClick={() => { localStorage.removeItem("vdf_delivery_token"); localStorage.removeItem("vdf_delivery_user"); nav("/delivery-login"); }}
        style={{ background: "var(--red-soft)", color: "var(--red-ink)", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Sign out
      </button>
    </div>
  );
}
