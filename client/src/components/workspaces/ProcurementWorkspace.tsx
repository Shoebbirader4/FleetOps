import { Check } from "lucide-react";
import { WorkspaceState as State } from "@/components/workspaces/WorkspaceState";
import { trpc } from "@/lib/trpc";
import type { ProcurementOrderRow } from "@/types/fleet";

export function ProcurementWorkspace() {
  const orders = trpc.purchaseOrders.list.useQuery(undefined, { retry: false });
  return <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Inventory automation</div><h2>Purchase orders</h2></div><span className="signal-chip good"><Check size={13} /> Drafts synced</span></div><State loading={orders.isLoading} error={orders.isError} empty={!orders.isLoading && !orders.isError && !orders.data?.length}><div className="resource-list">{(orders.data ?? []).map((order: ProcurementOrderRow) => <div className="resource-row" key={order.id}><div><strong>PO-{order.id.slice(0, 8).toUpperCase()}</strong><span>{order.vendor?.name ?? "Vendor pending"} · ₹{Number(order.totalCost).toLocaleString("en-IN")}</span></div><span className={`status-label ${String(order.status).toLowerCase()}`}>{order.status}</span></div>)}</div></State></section>;
}

