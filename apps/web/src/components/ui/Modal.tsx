import { useEffect } from "react";

export function Modal({ title, onClose, children, width = 480 }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", background: "var(--surface)", borderRadius: 20, boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface-2)", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center" }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, border: "1.5px solid var(--border-2)", borderRadius: 10, padding: "0 13px",
  fontSize: 14, background: "var(--surface)", color: "var(--ink)", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

export const selectStyle: React.CSSProperties = {
  ...{} as React.CSSProperties,
  width: "100%", height: 44, border: "1.5px solid var(--border-2)", borderRadius: 10, padding: "0 13px",
  fontSize: 14, background: "var(--surface)", color: "var(--ink)", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const,
  cursor: "pointer",
};
