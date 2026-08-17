import { useState } from "react";
import { ArrowLeft, Check, Mail, Plus, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const roleOptions = ["FLEET_MANAGER", "MECHANIC", "TECHNICIAN", "DRIVER", "INVENTORY_MANAGER", "ACCOUNTANT"] as const;
type Props = { section: string; session: boolean; onBack: () => void };

function State({ loading, error, empty, children }: { loading?: boolean; error?: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <div className="workspace-state"><RefreshCw className="spin" size={18} /> Loading live FleetOps data…</div>;
  if (error) return <div className="workspace-state error-state">This workspace could not load from Supabase. Check your session and try again.</div>;
  if (empty) return <div className="workspace-state">No records yet. Use the action above to create the first record.</div>;
  return <>{children}</>;
}

function TeamWorkspace() {
  const utils = trpc.useUtils();
  const members = trpc.team.members.useQuery(undefined, { retry: false });
  const invitations = trpc.team.invitations.useQuery(undefined, { retry: false });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("FLEET_MANAGER");
  const invite = trpc.team.invite.useMutation({ onSuccess: () => { setEmail(""); toast.success("Invitation created", { description: "Copy the token from the invitation record and send it to the teammate." }); void utils.team.members.invalidate(); void utils.team.invitations.invalidate(); }, onError: (error) => toast.error("Invitation failed", { description: error.message }) });
  return <>
    <div className="workspace-form panel"><div><div className="panel-kicker">Team access</div><h2>Invite a teammate</h2><p>Choose the least-privileged role needed for the job. Invitations expire after seven days.</p></div><form onSubmit={(event) => { event.preventDefault(); if (email) invite.mutate({ email, role }); }} className="invite-form"><label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" /></label><label>Role<select value={role} onChange={(event) => setRole(event.target.value as (typeof roleOptions)[number])}>{roleOptions.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><button className="primary-button" disabled={invite.isPending}><UserPlus size={16} />{invite.isPending ? "Creating…" : "Create invitation"}</button></form></div>
    <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Organization directory</div><h2>Members</h2></div><span className="signal-chip good"><ShieldCheck size={13} /> RLS protected</span></div><State loading={members.isLoading} error={members.isError} empty={!members.isLoading && !members.isError && !members.data?.length}><div className="member-list">{members.data?.map((member: any) => <div className="member-row" key={member.id}><div className="mini-avatar">{String(member.fullName ?? member.email).slice(0, 2).toUpperCase()}</div><div><strong>{member.fullName ?? "Unnamed member"}</strong><span>{member.email}</span></div><span className="role-pill">{String(member.role).replaceAll("_", " ")}</span></div>)}</div></State></section>
    <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Invitation ledger</div><h2>Invitation status</h2></div><span className="signal-chip warn"><Mail size={13} /> {invitations.data?.length ?? 0} records</span></div><State loading={invitations.isLoading} error={invitations.isError} empty={!invitations.isLoading && !invitations.isError && !invitations.data?.length}><div className="resource-list">{invitations.data?.map((invite: any) => { const status = invite.acceptedAt ? "Accepted" : new Date(invite.expiresAt) < new Date() ? "Expired" : "Pending"; return <div className="resource-row" key={invite.id}><div><strong>{invite.email}</strong><span>{String(invite.role).replaceAll("_", " ")} · token {String(invite.tokenHash).slice(0, 8)}…</span></div><span className={`status-label ${status.toLowerCase()}`}>{status}</span></div>; })}</div></State></section>
  </>;
}

function ResourceWorkspace({ section }: { section: string }) {
  const vehicles = trpc.vehicles.list.useQuery(undefined, { enabled: section === "Vehicles", retry: false });
  const orders = trpc.workOrders.list.useQuery(undefined, { enabled: section === "Work orders", retry: false });
  const inventory = trpc.inventory.list.useQuery(undefined, { enabled: section === "Inventory", retry: false });
  const notifications = trpc.notifications.list.useQuery(undefined, { enabled: section === "Notifications", retry: false });
  const documents = trpc.documents.list.useQuery(undefined, { enabled: section === "Compliance vault", retry: false });
  const financials = trpc.financials.list.useQuery(undefined, { enabled: section === "P&L analytics", retry: false });
  const billing = trpc.billing.status.useQuery(undefined, { enabled: section === "Billing", retry: false });
  const query = section === "Vehicles" ? vehicles : section === "Work orders" ? orders : section === "Inventory" ? inventory : section === "Notifications" ? notifications : section === "Compliance vault" ? documents : financials;
  const labels: Record<string, string> = { Vehicles: "Fleet register", "Work orders": "Maintenance queue", Inventory: "Parts ledger", Notifications: "Notification center", "Compliance vault": "Compliance documents", "P&L analytics": "Financial ledger" };
  if (section === "Billing") return <section className="panel workspace-table billing-workspace"><div className="panel-heading"><div><div className="panel-kicker">Subscription control</div><h2>Billing & limits</h2></div><span className="signal-chip good"><Check size={13} /> Live status</span></div><State loading={billing.isLoading} error={billing.isError} empty={!billing.data}><div className="billing-grid"><div><span>Current tier</span><strong>{billing.data?.tier?.replaceAll("_", " ")}</strong></div><div><span>Trial days remaining</span><strong>{billing.data?.daysRemaining}</strong></div><div><span>Vehicle capacity</span><strong>{billing.data?.maxVehicles}</strong></div><div><span>Team capacity</span><strong>{billing.data?.maxUsers}</strong></div></div><div className="billing-note">{billing.data?.writeLocked ? "Your trial is expired. New writes are locked until the plan is upgraded." : "Your workspace is accepting writes. Razorpay checkout can be connected from the billing integration settings."}</div></State></section>;
  const rows = (query.data ?? []) as any[];
  return <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Persisted Supabase records</div><h2>{labels[section]}</h2></div><span className="signal-chip good"><Check size={13} /> Live query</span></div><State loading={query.isLoading} error={query.isError} empty={!query.isLoading && !query.isError && !rows.length}><div className="resource-list">{rows.map((row) => <div className="resource-row" key={row.id}><div><strong>{row.name ?? row.title ?? row.licensePlate ?? row.sku ?? row.email ?? row.category ?? "Fleet record"}</strong><span>{row.description ?? row.message ?? row.make ? `${row.make ?? ""} ${row.model ?? ""}` : row.status ?? row.role ?? row.docType ?? row.type ?? "Persisted record"}</span></div><span className="resource-meta">{row.status ?? row.quantityOnHand ?? row.amount ?? row.expiresAt ? String(row.status ?? row.quantityOnHand ?? row.amount ?? row.expiresAt) : "—"}</span></div>)}</div></State></section>;
}

export default function FunctionalWorkspace({ section, session, onBack }: Props) {
  if (!session) return <section className="panel auth-gate"><Mail size={24} /><h2>Sign in to open {section}</h2><p>This workspace is connected to Supabase and does not show demo records while signed out.</p><button className="primary-button" onClick={() => toast.info("Use your Supabase Auth sign-in flow to continue.")}><Plus size={16} /> Sign in to sync</button></section>;
  return <div className="functional-workspace"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to command center</button>{section === "Team" ? <TeamWorkspace /> : <ResourceWorkspace section={section} />}</div>;
}
