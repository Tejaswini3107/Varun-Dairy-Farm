import { useState } from "react";

export default function CustomerSubscription() {
  const [milkQty, setMilkQty] = useState(3);
  const monthly = ((milkQty * 48 + 40) * 30).toLocaleString("en-IN");

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Subscription</h2>
        <span style={{ fontSize: 20 }}>📅</span>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
        {[
          { icon: "🥛", name: "Toned milk", meta: "Daily · ₹48/L", qty: milkQty, setQty: setMilkQty, min: 1, max: 9 },
          { icon: "🥣", name: "Curd", meta: "Daily · ₹40", qty: 1, setQty: () => {}, min: 0, max: 5 },
        ].map((item, i) => (
          <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, paddingTop: i > 0 ? 12 : 0, borderBottom: i === 0 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{item.meta}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => item.setQty((q: number) => Math.max(item.min, q - 1))} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 40, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => item.setQty((q: number) => Math.min(item.max, q + 1))} style={{ width: 30, height: 30, borderRadius: 9, border: "1px solid var(--border-2)", background: "var(--surface)", fontSize: 17, cursor: "pointer" }}>+</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 15, marginBottom: 13 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Delivery controls</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {["⏸ Pause delivery", "🏖 Vacation mode"].map(l => (
            <button key={l} style={{ flex: 1, border: "1px solid var(--border-2)", borderRadius: 11, height: 42, background: "var(--surface)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        <button style={{ width: "100%", border: "1px solid var(--border-2)", borderRadius: 11, height: 42, background: "var(--surface)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>⏱ Temporary change for tomorrow</button>
      </div>

      <div style={{ background: "var(--blue-soft)", borderRadius: 14, padding: 15, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "var(--blue-ink)" }}>Est. monthly bill</span>
        <span style={{ fontWeight: 700, color: "var(--blue-ink)", fontFamily: "monospace" }}>₹{monthly}</span>
      </div>
    </div>
  );
}
