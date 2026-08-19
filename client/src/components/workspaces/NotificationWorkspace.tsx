import { Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { NotificationRow } from "@/types/fleet";
import { WorkspaceState } from "./WorkspaceState";

export function NotificationWorkspace() {
  const utils = trpc.useUtils();
  const notifications = trpc.notifications.list.useQuery(undefined, { retry: false });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => { void utils.notifications.list.invalidate(); void utils.activity.recent.invalidate(); }, onError: (error) => toast.error("Notification update failed", { description: error.message }) });
  const unread = notifications.data?.filter((item: NotificationRow) => !item.isRead) ?? [];
  return <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Recipient-scoped Supabase alerts</div><h2>Notification center</h2></div><span className={`signal-chip ${unread.length ? "warn" : "good"}`}><Mail size={13} /> {unread.length} unread</span></div><WorkspaceState loading={notifications.isLoading} error={notifications.isError} empty={!notifications.isLoading && !notifications.isError && !notifications.data?.length}><div className="resource-list">{notifications.data?.map((item: NotificationRow) => <div className={`resource-row ${item.isRead ? "notification-read" : "notification-unread"}`} key={item.id}><div><strong>{item.title}</strong><span>{item.message}</span><small>{new Date((item as NotificationRow & { createdAt: string | Date }).createdAt).toLocaleString("en-IN")}</small></div><div className="notification-actions">{item.isRead ? <span className="status-label accepted">Read</span> : <button className="secondary-button compact-button" onClick={() => markRead.mutate({ id: item.id })} disabled={markRead.isPending}><Check size={14} /> Mark read</button>}</div></div>)}</div></WorkspaceState></section>;
}
