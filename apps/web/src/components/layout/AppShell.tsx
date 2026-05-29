import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useThemeStore } from "@/store";

export default function AppShell() {
  const { toggle } = useThemeStore();
  const nav = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("vdf_admin_user") ?? "null"); } catch { return null; } })();

  function logout() {
    localStorage.removeItem("vdf_admin_token");
    localStorage.removeItem("vdf_admin_user");
    nav("/admin-login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* App bar */}
      <header className="sticky top-0 z-50 flex items-center gap-4 px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5 font-bold text-[16px] tracking-tight">
          <div className="w-8 h-8 rounded-[9px] bg-[var(--blue)] grid place-items-center text-white text-lg">
            <i className="ti ti-milk" />
          </div>
          <div>
            Varun Dairy Farm
            <div className="text-[10.5px] font-medium text-[var(--muted)] tracking-normal">
              Hyderabad · operations cloud
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {user && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
            <i className="ti ti-user-circle text-[16px]" />
            <span className="font-medium text-[var(--ink)]">{user.name}</span>
          </div>
        )}

        <button
          onClick={toggle}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-all"
          aria-label="Toggle theme"
        >
          <i className="ti ti-moon-stars text-[18px]" />
        </button>

        <button
          onClick={logout}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--red-soft)] hover:text-[var(--red-ink)] transition-all"
          aria-label="Sign out"
          title="Sign out"
        >
          <i className="ti ti-logout text-[18px]" />
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-7 py-6 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
