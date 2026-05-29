import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useThemeStore } from "./store";
import { useEffect } from "react";

// Admin
import AppShell from "./components/layout/AppShell";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Delivery from "./pages/Delivery";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";

// Delivery app
import DeliveryLogin from "./pages/delivery/DeliveryLogin";
import DeliveryApp from "./pages/delivery/DeliveryApp";

// Customer app
import CustomerLogin from "./pages/customer/CustomerLogin";
import CustomerApp from "./pages/customer/CustomerApp";

function AdminGuard() {
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_user") ?? "null"); } catch { return null; } })();
  if (!user || !["admin", "manager"].includes(user.role)) return <Navigate to="/admin-login" replace />;
  return <Outlet />;
}

export default function App() {
  const { dark } = useThemeStore();
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route element={<AdminGuard />}>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="billing" element={<Billing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="staff" element={<Staff />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="/delivery-login" element={<DeliveryLogin />} />
        <Route path="/delivery-app/*" element={<DeliveryApp />} />

        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/customer-app/*" element={<CustomerApp />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
