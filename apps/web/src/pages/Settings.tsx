import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const roles = [
  { name: "Admin", desc: "Full access", badge: "green" as const, label: "All modules" },
  { name: "Operations manager", desc: "No finance edit", badge: "blue" as const, label: "7 modules" },
  { name: "Delivery staff", desc: "Mobile app only", badge: "gray" as const, label: "Route + collect" },
];

const integrations = [
  { icon: "ti-brand-google", label: "UPI", connected: true },
  { icon: "ti-credit-card", label: "Razorpay", connected: true },
  { icon: "ti-device-mobile", label: "PhonePe", connected: false },
  { icon: "ti-brand-whatsapp", label: "WhatsApp (Gupshup)", connected: true },
  { icon: "ti-brand-firebase", label: "Firebase FCM", connected: true },
];

export default function Settings() {
  return (
    <div className="animate-fade">
      <div className="mb-5">
        <h2 className="text-[21px] font-semibold">Settings &amp; roles</h2>
        <p className="text-[13px] text-[var(--muted)] mt-0.5">Permissions, integrations &amp; preferences</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card pad>
          <CardHeader title="Role permissions" />
          {roles.map((r) => (
            <div key={r.name} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
              <div>
                <div className="font-semibold text-[13.5px]">{r.name}</div>
                <div className="text-[11.5px] text-[var(--muted)]">{r.desc}</div>
              </div>
              <Badge variant={r.badge}>{r.label}</Badge>
            </div>
          ))}
        </Card>

        <Card pad>
          <CardHeader title="Payment &amp; service integrations" />
          {integrations.map((i) => (
            <div key={i.label} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
              <div className="flex items-center gap-2 font-semibold text-[13.5px]">
                <i className={`ti ${i.icon} text-[var(--blue)]`} />
                {i.label}
              </div>
              {i.connected
                ? <Badge variant="green"><i className="ti ti-circle-check text-[10px]" /> Connected</Badge>
                : <Badge variant="gray">Set up</Badge>}
            </div>
          ))}
        </Card>
      </div>

      <Card pad>
        <CardHeader title="Business details" />
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Business name", value: "Varun Dairy Farm" },
            { label: "City", value: "Hyderabad, Telangana" },
            { label: "GST number", value: "36XXXXX1234X1ZX" },
            { label: "Support phone", value: "+91 91000 00000" },
            { label: "Order cutoff time", value: "9:00 PM (daily)" },
            { label: "Delivery window", value: "5:30 AM – 9:00 AM" },
          ].map((f) => (
            <div key={f.label} className="flex justify-between text-[13px] py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--muted)]">{f.label}</span>
              <span className="font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
