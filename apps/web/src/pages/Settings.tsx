import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, Field, inputStyle } from "@/components/ui/Modal";

const LS_KEY = "vdf_settings";
const DEFAULT_DETAILS = {
  businessName: "Varun Dairy Farm",
  city: "Hyderabad, Telangana",
  gst: "36XXXXX1234X1ZX",
  phone: "+91 91000 00000",
  cutoff: "9:00 PM (daily)",
  window: "5:30 AM – 9:00 AM",
};
const FIELD_LABELS: Record<string, string> = {
  businessName: "Business name", city: "City", gst: "GST number",
  phone: "Support phone", cutoff: "Order cutoff time", window: "Delivery window",
};
function loadDetails() {
  try { return { ...DEFAULT_DETAILS, ...JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") }; }
  catch { return DEFAULT_DETAILS; }
}

const roles = [
  { name: "Admin", desc: "Full access", badge: "green" as const, label: "All modules" },
  { name: "Operations manager", desc: "No finance edit", badge: "blue" as const, label: "7 modules" },
  { name: "Delivery staff", desc: "Mobile app only", badge: "gray" as const, label: "Route + collect" },
];

const integrations = [
  { icon: "ti-brand-google", label: "UPI", connected: true },
  { icon: "ti-credit-card", label: "Razorpay", connected: false },
  { icon: "ti-device-mobile", label: "PhonePe", connected: false },
  { icon: "ti-brand-whatsapp", label: "WhatsApp (Gupshup)", connected: false },
  { icon: "ti-brand-firebase", label: "Firebase FCM", connected: false },
];

export default function Settings() {
  const [details, setDetails] = useState(loadDetails);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(details);
  const [saved, setSaved] = useState(false);

  function openEdit() { setDraft(details); setEditing(true); }
  function saveEdit() {
    setDetails(draft);
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
        <div className="flex items-center justify-between mb-3">
          <CardHeader title="Business details" />
          <Button onClick={openEdit}><i className="ti ti-pencil text-xs" /> Edit</Button>
        </div>
        {saved && <p className="text-[12px] text-[var(--green-ink)] mb-2">✓ Changes saved</p>}
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(FIELD_LABELS) as (keyof typeof DEFAULT_DETAILS)[]).map((k) => (
            <div key={k} className="flex justify-between text-[13px] py-2 border-b border-[var(--border)] last:border-0">
              <span className="text-[var(--muted)]">{FIELD_LABELS[k]}</span>
              <span className="font-medium">{details[k]}</span>
            </div>
          ))}
        </div>
      </Card>

      {editing && (
        <Modal title="Edit business details" onClose={() => setEditing(false)}>
          {(Object.keys(FIELD_LABELS) as (keyof typeof DEFAULT_DETAILS)[]).map((k) => (
            <Field key={k} label={FIELD_LABELS[k]}>
              <input style={inputStyle} value={draft[k]}
                onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
            </Field>
          ))}
          <div className="flex gap-2 mt-2">
            <Button className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={saveEdit}>Save changes</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
