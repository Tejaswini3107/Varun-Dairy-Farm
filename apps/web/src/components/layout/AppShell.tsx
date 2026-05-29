import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useThemeStore } from "@/store";

export default function AppShell() {
  const { toggle } = useThemeStore();

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

        <button
          onClick={toggle}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] transition-all"
          aria-label="Toggle theme"
        >
          <i className="ti ti-moon-stars text-[18px]" />
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
