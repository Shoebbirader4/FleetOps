import { Check, ChevronUp, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { NotificationRow } from "@/types/fleet";
import { WorkspaceState } from "./WorkspaceState";

export function NotificationWorkspace() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const notifications = trpc.notifications.list.useQuery(undefined, { retry: false });
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const canManage = me.data?.role === "SUPERADMIN" || me.data?.role === "FLEET_MANAGER";
  const refresh = () => { void utils.notifications.list.invalidate(); void utils.activity.recent.invalidate(); };
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: refresh, onError: (error) => toast.error("Notification update failed", { description: error.message }) });
  const escalate = trpc.notifications.escalate.useMutation({ onSuccess: () => { refresh(); toast.success("Notification escalated"); }, onError: (error) => toast.error("Escalation failed", { description: error.message }) });
  const resolve = trpc.notifications.resolve.useMutation({ onSuccess: () => { refresh(); toast.success("Notification resolved"); }, onError: (error) => toast.error("Resolution failed", { description: error.message }) });
  const unread = notifications.data?.filter((item: NotificationRow) => !item.isRead) ?? [];
  return <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Recipient-scoped Supabase alerts</div><h2>Notification center</h2></div><span className={`signal-chip ${unread.length ? "warn" : "good"}`}><Mail size={13} /> {unread.length} unread</span></div><WorkspaceState loading={notifications.isLoading} error={notifications.isError} empty={!notifications.isLoading && !notifications.isError && !notifications.data?.length}><div className="resource-list">{notifications.data?.map((item: NotificationRow) => { const extended = item as NotificationRow & { createdAt: string | Date; acknowledgedAt?: string | Date | null; resolvedAt?: string | Date | null; escalationLevel?: number }; const note = resolutionNotes[item.id] ?? ""; return <div className={`resource-row ${item.isRead ? "notification-read" : "notification-unread"}`} key={item.id}><div><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(extended.createdAt).toLocaleString("en-IN")}{extended.escalationLevel ? ` · Escalation ${extended.escalationLevel}` : ""}</small></div><div className="notification-actions">{extended.resolvedAt ? <span className="status-label accepted"><ShieldCheck size={14} /> Resolved</span> : <>{!item.isRead && <button className="secondary-button compact-button" onClick={() => markRead.mutate({ id: item.id })} disabled={markRead.isPending}><Check size={14} /> Mark read</button>}{canManage && <><button className="secondary-button compact-button" onClick={() => escalate.mutate({ id: item.id })} disabled={escalate.isPending}><ChevronUp size={14} /> Escalate</button><div className="notification-resolution"><input aria-label={`Resolution note for ${item.title}`} value={note} onChange={(event) => setResolutionNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Resolution note" /><button className="secondary-button compact-button" onClick={() => resolve.mutate({ id: item.id, note: note.trim() })} disabled={resolve.isPending || note.trim().length < 3}>Resolve</button></div></>}</>}</div></div>; })}</div></WorkspaceState></section>;
}
