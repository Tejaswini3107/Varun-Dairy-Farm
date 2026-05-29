import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", icon: "ti-layout-dashboard", label: "Dashboard" },
  { label: "Operations", type: "section" as const },
  { to: "/customers", icon: "ti-users", label: "Customers" },
  { to: "/inventory", icon: "ti-building-warehouse", label: "Inventory" },
  { to: "/orders", icon: "ti-clipboard-list", label: "Orders" },
  { to: "/delivery", icon: "ti-route", label: "Delivery" },
  { label: "Finance", type: "section" as const },
  { to: "/billing", icon: "ti-receipt", label: "Billing", badge: "3" },
  { to: "/reports", icon: "ti-chart-bar", label: "Reports" },
  { label: "System", type: "section" as const },
  { to: "/staff", icon: "ti-id-badge", label: "Staff" },
  { to: "/settings", icon: "ti-settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-[228px] flex-none bg-[var(--surface)] border-r border-[var(--border)] flex flex-col gap-0.5 px-3.5 py-4 overflow-y-auto">
      {nav.map((item, i) => {
        if (item.type === "section") {
          return (
            <div key={i} className="text-[10.5px] font-semibold uppercase tracking-widest text-[var(--faint)] mt-4 mb-1.5 mx-2">
              {item.label}
            </div>
          );
        }
        return (
          <NavLink
            key={item.to}
            to={item.to!}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13.5px] font-medium transition-all duration-150",
                isActive
                  ? "bg-[var(--blue-soft)] text-[var(--blue-ink)] font-semibold"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              )
            }
          >
            <i className={`ti ${item.icon} text-[18px]`} />
            {item.label}
            {item.badge && (
              <span className="ml-auto text-[10px] font-bold bg-[var(--red)] text-white px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </aside>
  );
}
