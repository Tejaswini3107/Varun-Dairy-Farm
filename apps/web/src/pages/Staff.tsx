import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmt, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const MOCK_STAFF = [
  { id: "1", name: "Sanjay Kumar", phone: "9100000001", role: "delivery_agent", status: "on_road", routeName: "Route 3", routeArea: "Kondapur", totalStops: 42, completedDeliveries: 18, totalCollection: 4180, joinedAt: "2023-01-15" },
  { id: "2", name: "Amit Mishra", phone: "9100000002", role: "delivery_agent", status: "on_road", routeName: "Route 5", routeArea: "Gachibowli", totalStops: 38, completedDeliveries: 23, totalCollection: 5320, joinedAt: "2022-11-01" },
  { id: "3", name: "Deepak R", phone: "9100000003", role: "delivery_agent", status: "completed", routeName: "Route 1", routeArea: "Jubilee Hills", totalStops: 44, completedDeliveries: 44, totalCollection: 9900, joinedAt: "2022-08-20" },
];

const statusBadge = (s: string) => {
  if (s === "on_road") return <Badge variant="blue"><i className="ti ti-truck-delivery text-[10px]" /> On road</Badge>;
  if (s === "completed") return <Badge variant="green"><i className="ti ti-check text-[10px]" /> Completed</Badge>;
  return <Badge variant="gray">Off duty</Badge>;
};

export default function Staff() {
  const { data } = useQuery({
    queryKey: ["staff"],
    queryFn: () => api.get<{ data: typeof MOCK_STAFF }>("/staff"),
    placeholderData: { data: MOCK_STAFF },
  });

  const staff = data?.data ?? [];

  return (
    <div className="animate-fade">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[21px] font-semibold">Staff management</h2>
          <p className="text-[13px] text-[var(--muted)] mt-0.5">5 line managers · delivery agents</p>
        </div>
        <Button variant="primary"><i className="ti ti-plus" /> Add staff</Button>
      </div>

      <Card>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Agent", "Route", "Deliveries", "Collection", "Status"].map((h) => (
                <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--faint)] text-left px-3.5 pb-3 pt-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--surface-2)]">
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[var(--blue-soft)] text-[var(--blue-ink)] grid place-items-center text-[12px] font-semibold flex-none">
                      {initials(s.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-[13.5px]">{s.name}</div>
                      <div className="text-[11.5px] text-[var(--muted)]">{s.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] text-[13.5px]">
                  {s.routeName}<br /><span className="text-[11.5px] text-[var(--muted)]">{s.routeArea}</span>
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono text-[13.5px]">
                  {s.completedDeliveries} / {s.totalStops}
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)] font-mono font-semibold text-[13.5px]">
                  {fmt(s.totalCollection)}
                </td>
                <td className="px-3.5 py-3.5 border-t border-[var(--border)]">
                  {statusBadge(s.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
