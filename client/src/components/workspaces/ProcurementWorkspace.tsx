import { Check } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceState as State } from "@/components/workspaces/WorkspaceState";
import { trpc } from "@/lib/trpc";
import type { ProcurementOrderRow } from "@/types/fleet";

export function ProcurementWorkspace() {
  const utils = trpc.useUtils();
  const orders = trpc.purchaseOrders.list.useQuery(undefined, { retry: false });
  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({ onSuccess: () => { toast.success("Purchase order status updated"); void utils.purchaseOrders.list.invalidate(); }, onError: (error) => toast.error("Purchase order update failed", { description: error.message }) });
  return <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Inventory automation</div><h2>Purchase orders</h2></div><span className="signal-chip good"><Check size={13} /> Drafts synced</span></div><State loading={orders.isLoading} error={orders.isError} empty={!orders.isLoading && !orders.isError && !orders.data?.length}><div className="resource-list">{(orders.data ?? []).map((order: ProcurementOrderRow) => <div className="resource-row" key={order.id}><div><strong>PO-{order.id.slice(0, 8).toUpperCase()}</strong><span>{order.vendor?.name ?? "Vendor pending"} · ₹{Number(order.totalCost).toLocaleString("en-IN")}</span></div><div className="inline-actions"><select className="role-pill" aria-label={`Update purchase order ${order.id}`} value={String(order.status)} disabled={updateStatus.isPending || ["RECEIVED", "CANCELLED"].includes(String(order.status))} onChange={(event) => updateStatus.mutate({ id: order.id, status: event.target.value as "DRAFT" | "SENT" | "RECEIVED" | "CANCELLED", expectedUpdatedAt: order.updatedAt })}><option value="DRAFT">Draft</option><option value="SENT">Sent</option><option value="RECEIVED">Received</option><option value="CANCELLED">Cancelled</option></select><span className={`status-label ${String(order.status).toLowerCase()}`}>{order.status}</span></div></div>)}</div></State></section>;
}

