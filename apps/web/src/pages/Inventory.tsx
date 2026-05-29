import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { InventoryItem } from "@varun/shared";

const MOCK: InventoryItem[] = [
  { id: "1", productId: "p1", product: { id: "p1", name: "Toned Milk", unit: "L", pricePerUnit: 48, category: "milk", isActive: true }, batchNumber: "B-2261", quantity: 200, capacity: 620, status: "low", reorderLevel: 200, lastUpdated: new Date().toISOString() },
  { id: "2", productId: "p2", product: { id: "p2", name: "Curd", unit: "cup", pricePerUnit: 40, category: "curd", isActive: true }, batchNumber: "B-2258", quantity: 410, capacity: 560, status: "healthy", reorderLevel: 100, lastUpdated: new Date().toISOString() },
  { id: "3", productId: "p3", product: { id: "p3", name: "Ghee · 500 ml", unit: "tin", pricePerUnit: 320, category: "ghee", isActive: true }, batchNumber: "B-2240", quantity: 12, capacity: 140, status: "critical", reorderLevel: 20, lastUpdated: new Date().toISOString() },
  { id: "4", productId: "p4", product: { id: "p4", name: "Paneer", unit: "block", pricePerUnit: 80, category: "paneer", isActive: true }, batchNumber: "B-2241", quantity: 64, capacity: 140, expiryDate: new Date(Date.now() + 86400000).toISOString(), status: "expiring", reorderLevel: 30, lastUpdated: new Date().toISOString() },
  { id: "5", productId: "p5", product: { id: "p5", name: "Packaging", unit: "units", pricePerUnit: 0, category: "other", isActive: true }, batchNumber: "PKG-01", quantity: 8800, capacity: 10000, status: "healthy", reorderLevel: 1000, lastUpdated: new Date().toISOString() },
];

const statusConfig: Record<string, { badge: "green" | "amber" | "red" | "gray"; label: string }> = {
  healthy: { badge: "green", label: "Healthy" },
  low: { badge: "amber", label: "Low" },
  critical: { badge: "red", label: "Critical" },
  expiring: { badge: "amber", label: "Expiring" },
};

const catIcon: Record<string, string> = {
  milk: "ti-bottle", curd: "ti-bowl", ghee: "ti-droplet", paneer: "ti-cheese", other: "ti-package",
};
const catBg: Record<string, string> = {
  milk: "bg-[var(--blue-soft)] text-[var(--blue-ink)]",
  curd: "bg-[var(--green-soft)] text-[var(--green-ink)]",
  ghee: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
  paneer: "bg-[var(--amber-soft)] text-[var(--amber-ink)]",
  other: "bg-[var(--surface-2)] text-[var(--muted)]",
};

export default function Inventory() {
  const { data } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => api.get<{ data: InventoryItem[] }>("/inventory"),
    placeholderData: { data: MOCK },
  });

  const items = data?.data ?? [];
  const pct = (qty: number, cap: number) => Math.round((qty / cap) * 100);
  const barColor = (s: string) => s === "critical" ? "var(--red)" : s === "low" || s === "expiring" ? "var(--amber)" : "var(--green)";

  return (
    <div className="animate-fade">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Inventory &amp; stock</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">Live stock across products, packaging &amp; batches</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button><i className="ti ti-history" /> Movement log</Button>
          <Button variant="primary"><i className="ti ti-plus" /> Purchase entry</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => {
          const cat = item.product?.category ?? "other";
          const p = pct(item.quantity, item.capacity);
          const sc = statusConfig[item.status] ?? { badge: "gray" as const, label: item.status };
          return (
            <Card key={item.id} className="p-[17px]">
              <div className="flex items-center gap-3 mb-3.5">
                <div className={`w-[42px] h-[42px] rounded-[12px] flex items-center justify-center text-[21px] ${catBg[cat]}`}>
                  <i className={`ti ${catIcon[cat] ?? "ti-package"}`} />
                </div>
                <div>
                  <div className="text-[14.5px] font-semibold">{item.product?.name ?? "—"}</div>
                  <div className="text-[11.5px] text-[var(--muted)]">Batch {item.batchNumber}</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: barColor(item.status) }} />
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--muted)]">
                <span><b className="text-[var(--ink)]">{item.quantity.toLocaleString("en-IN")}</b> / {item.capacity.toLocaleString("en-IN")} {item.product?.unit}</span>
                <Badge variant={sc.badge}>{sc.label}</Badge>
              </div>
              {item.expiryDate && (
                <div className="mt-2 text-[11.5px] text-[var(--amber-ink)]">
                  <i className="ti ti-clock text-xs" /> Expires {new Date(item.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
