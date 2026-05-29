export default function CustomerStore() {
  const products = [
    { icon: "🥛", name: "Toned milk", price: "₹48 / L", bg: "var(--blue-soft)", color: "var(--blue-ink)" },
    { icon: "🥣", name: "Curd", price: "₹40", bg: "var(--green-soft)", color: "var(--green-ink)" },
    { icon: "🫙", name: "Pure ghee", price: "₹320", bg: "var(--amber-soft)", color: "var(--amber-ink)" },
    { icon: "🧀", name: "Paneer", price: "₹80", bg: "var(--blue-soft)", color: "var(--blue-ink)" },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Store</h2>
        <span style={{ fontSize: 20, cursor: "pointer" }}>🔍</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {products.map(p => (
          <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <div style={{ width: 56, height: 56, borderRadius: 15, background: p.bg, display: "grid", placeItems: "center", fontSize: 28, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontFamily: "monospace" }}>{p.price}</div>
            <button style={{ width: "100%", border: "1px solid var(--border-2)", borderRadius: 10, height: 36, background: "var(--surface-2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add</button>
          </div>
        ))}
      </div>
    </div>
  );
}
