import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { WorkspaceState as State } from "@/components/workspaces/WorkspaceState";

export function OrganizationSettingsWorkspace() {
  const utils = trpc.useUtils();
  const settings = trpc.organizationSettings.get.useQuery(undefined, { retry: false });
  const [form, setForm] = useState({ timezone: "Asia/Kolkata", odometerMaxDailyKm: "1000", safetyContactName: "", safetyContactPhone: "" });
  useEffect(() => { if (settings.data) setForm({ timezone: settings.data.timezone ?? "Asia/Kolkata", odometerMaxDailyKm: String(settings.data.odometerMaxDailyKm ?? 1000), safetyContactName: settings.data.safetyContactName ?? "", safetyContactPhone: settings.data.safetyContactPhone ?? "" }); }, [settings.data]);
  const update = trpc.organizationSettings.update.useMutation({ onSuccess: () => { toast.success("Organization settings saved"); void utils.organizationSettings.get.invalidate(); }, onError: (error) => toast.error("Settings update failed", { description: error.message }) });
  return <section className="panel workspace-form"><div><div className="panel-kicker">Superadmin governance</div><h2>Organization settings</h2><p>Configure the operating timezone, odometer policy, and safety escalation contact for this organization.</p></div><State loading={settings.isLoading} error={settings.isError}><form className="invite-form" onSubmit={(event) => { event.preventDefault(); update.mutate({ timezone: form.timezone, odometerMaxDailyKm: Number(form.odometerMaxDailyKm), safetyContactName: form.safetyContactName || undefined, safetyContactPhone: form.safetyContactPhone || undefined }); }}><label>Operating timezone<input required value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} placeholder="Asia/Kolkata" /></label><label>Maximum odometer increase per day (km)<input required type="number" min="100" max="5000" value={form.odometerMaxDailyKm} onChange={(event) => setForm({ ...form, odometerMaxDailyKm: event.target.value })} /></label><label>Safety escalation contact<input value={form.safetyContactName} onChange={(event) => setForm({ ...form, safetyContactName: event.target.value })} placeholder="Operations control room" /></label><label>Safety contact phone<input value={form.safetyContactPhone} onChange={(event) => setForm({ ...form, safetyContactPhone: event.target.value })} placeholder="+91 …" /></label><button className="primary-button" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save organization settings"}</button></form></State></section>;
}

