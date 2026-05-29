import { useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import CustomerHome from "./CustomerHome";
import CustomerSubscription from "./CustomerSubscription";
import CustomerStore from "./CustomerStore";
import CustomerWallet from "./CustomerWallet";

export default function CustomerApp() {
  const nav = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_user") ?? "null"); } catch { return null; } })();

  useEffect(() => {
    if (!user || user.role !== "customer") nav("/customer-login");
  }, []);

  if (!user) return null;

  const tabs = [
    { to: "/customer-app/home", icon: "ti-home", label: "Home" },
    { to: "/customer-app/subscription", icon: "ti-calendar-event", label: "Plan" },
    { to: "/customer-app/store", icon: "ti-building-store", label: "Store" },
    { to: "/customer-app/wallet", icon: "ti-wallet", label: "Wallet" },
  ];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Status bar */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600 }}>
        <span style={{ fontFamily: "monospace" }}>9:41</span>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>Varun Dairy</span>
        <span style={{ display: "flex", gap: 6, fontSize: 14 }}>📶 🔋</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<CustomerHome user={user} />} />
          <Route path="subscription" element={<CustomerSubscription />} />
          <Route path="store" element={<CustomerStore />} />
          <Route path="wallet" element={<CustomerWallet />} />
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
