/* Signal Ledger: operational clarity before decoration; ink, ivory, signal orange, and route-line geometry. */
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bus,
  Check,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Command,
  Download,
  FileText,
  Fuel,
  Gauge,
  IndianRupee,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  TrendingUp,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useFleetOpsAuth } from "@/hooks/useFleetOpsAuth";
import { useFleetOpsRealtime } from "@/hooks/useFleetOpsRealtime";

const roles = [
  { name: "Owner command center", short: "Owner", icon: LayoutDashboard },
  { name: "Fleet manager workspace", short: "Fleet manager", icon: Bus },
  { name: "Inventory manager workspace", short: "Inventory", icon: Package },
  { name: "Mechanic workspace", short: "Mechanic", icon: Wrench },
  { name: "Driver workspace", short: "Driver", icon: ClipboardCheck },
  { name: "Accountant workspace", short: "Accountant", icon: IndianRupee },
];

const navItems = [
  { label: "Command center", icon: LayoutDashboard },
  { label: "Vehicles", icon: Bus, count: "24" },
  { label: "Work orders", icon: Wrench, count: "8" },
  { label: "Inventory", icon: Package, count: "3" },
  { label: "Compliance vault", icon: FileText },
  { label: "P&L analytics", icon: TrendingUp },
];

const vehicles = [
  { id: "MH 12 AB 4821", name: "Route 17 · Ashok Leyland", health: 94, status: "On route", odo: "184,220 km", service: "Brake inspection due in 620 km", tone: "good" },
  { id: "MH 12 CD 9017", name: "Route 4 · Tata Starbus", health: 81, status: "At depot", odo: "142,890 km", service: "Engine oil at 88% life", tone: "warn" },
  { id: "MH 14 EF 1106", name: "School charter · Eicher", health: 72, status: "Needs attention", odo: "96,540 km", service: "Tyre rotation overdue", tone: "danger" },
  { id: "MH 12 GH 7740", name: "Route 22 · BharatBenz", health: 97, status: "On route", odo: "210,480 km", service: "Next check in 1,820 km", tone: "good" },
];

const initialOrders = [
  { id: "WO-2481", title: "Replace front brake pads", vehicle: "MH 12 CD 9017", owner: "Ramesh K.", priority: "High", due: "Today, 14:30", status: "In progress" },
  { id: "WO-2478", title: "Investigate coolant pressure", vehicle: "MH 14 EF 1106", owner: "Sanjay P.", priority: "Critical", due: "Today, 12:00", status: "Open" },
  { id: "WO-2474", title: "Scheduled 20k km service", vehicle: "MH 12 AB 4821", owner: "Ramesh K.", priority: "Medium", due: "Tomorrow", status: "Open" },
  { id: "WO-2469", title: "Replace rear tyre pair", vehicle: "MH 12 GH 7740", owner: "Vikram S.", priority: "Low", due: "16 Aug", status: "Completed" },
];

const formatInr = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

function Metric({ label, value, delta, detail, icon: Icon, accent = "orange" }: { label: string; value: string; delta: string; detail: string; icon: typeof Activity; accent?: "orange" | "blue" | "green" }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span className={`icon-badge ${accent}`}><Icon size={16} /></span><span className="metric-label">{label}</span><MoreHorizontal size={17} className="muted-icon" /></div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot"><span className="delta-positive"><ArrowUpRight size={14} />{delta}</span><span>{detail}</span></div>
    </article>
  );
}

function HealthRing({ value }: { value: number }) {
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  return <div className="health-ring" style={{ "--ring-progress": `${(value / 100) * circumference}px` } as React.CSSProperties}><svg viewBox="0 0 64 64"><circle className="ring-track" cx="32" cy="32" r={radius} /><circle className="ring-value" cx="32" cy="32" r={radius} /></svg><strong>{value}</strong></div>;
}

export default function Home() {
  const { session, loading: authLoading, signOut } = useFleetOpsAuth();
  useEffect(() => {
    const onExpired = () => toast.warning("Supabase session expired", { description: "Sign in again to resume live FleetOps data." });
    window.addEventListener("fleetops-session-expired", onExpired);
    return () => window.removeEventListener("fleetops-session-expired", onExpired);
  }, []);
  const { data: backendSummary, isLoading: summaryLoading, isError: summaryError } = trpc.dashboard.summary.useQuery(undefined, { enabled: Boolean(session), retry: false });
  const { data: liveVehicles, isLoading: vehiclesLoading, isError: vehiclesError } = trpc.vehicles.list.useQuery(undefined, { enabled: Boolean(session), retry: false });
  const { data: liveOrders, isLoading: ordersLoading, isError: ordersError } = trpc.workOrders.list.useQuery(undefined, { enabled: Boolean(session), retry: false });
  const { data: liveInventory, isLoading: inventoryLoading, isError: inventoryError } = trpc.inventory.list.useQuery(undefined, { enabled: Boolean(session), retry: false });
  const { data: liveNotifications, isLoading: notificationsLoading, isError: notificationsError } = trpc.notifications.list.useQuery(undefined, { enabled: Boolean(session), retry: false });
  const { data: liveActivity, isLoading: activityLoading, isError: activityError } = trpc.activity.recent.useQuery(undefined, { enabled: Boolean(session), retry: false });
  useFleetOpsRealtime(backendSummary?.org.id);
  const persistedVehicles = useMemo(() => liveVehicles?.map((vehicle: any) => ({ id: vehicle.licensePlate, name: `${vehicle.make} ${vehicle.model} · ${vehicle.year}`, health: vehicle.status === "ACTIVE" ? 94 : 72, status: vehicle.status === "ACTIVE" ? "On route" : "At depot", odo: `${Number(vehicle.currentOdometer).toLocaleString("en-IN")} km`, service: "Live from FleetOps register", tone: vehicle.status === "ACTIVE" ? "good" : "warn" })) ?? vehicles, [liveVehicles]);
  const persistedOrders = useMemo(() => liveOrders?.map((order: any) => ({ id: order.id.slice(0, 8).toUpperCase(), title: order.title, vehicle: order.vehicle.licensePlate, owner: order.assignedMechanic?.fullName ?? "Unassigned", priority: order.priority[0] + order.priority.slice(1).toLowerCase(), due: order.status === "COMPLETED" ? "Completed" : "Open queue", status: order.status === "COMPLETED" ? "Completed" : "Open" })) ?? initialOrders, [liveOrders]);
  const [activeNav, setActiveNav] = useState("Command center");
  const [role, setRole] = useState(roles[0]);
  const [orders, setOrders] = useState(initialOrders);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All fleet");

  const visibleVehicles = useMemo(() => persistedVehicles.filter((vehicle: any) => `${vehicle.id} ${vehicle.name}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All fleet" || vehicle.status === filter)), [query, filter]);
  const visibleOrders = showAllOrders ? (liveOrders ? persistedOrders : orders) : (liveOrders ? persistedOrders.slice(0, 3) : orders.slice(0, 3));

  const completeOrder = (id: string) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status: "Completed" } : order));
    toast.success("Work order completed", { description: `${id} closed and inventory ledger updated.` });
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast.error("Sign out failed", { description: error.message });
    else toast.success("Signed out of FleetOps");
  };

  const chooseRole = (nextRole: typeof role) => {
    setRole(nextRole);
    setShowRoleMenu(false);
    toast.success(`${nextRole.short} workspace loaded`, { description: "Your role-specific actions are now in focus." });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? "mobile-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark"><img src="/manus-storage/fleetops-mark_7d77c5c7.png" alt="FleetOps signal mark" /></div><div><div className="brand-name">FleetOps</div><div className="brand-tag">Signal ledger</div></div><button className="mobile-close" onClick={() => setShowMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="org-switcher"><div className="org-avatar">AV</div><div className="org-copy"><strong>Avani Transit</strong><span>Mumbai · 24 vehicles</span></div><ChevronDown size={15} /></div>
        <div className="nav-caption">Workspace</div>
        <nav>{navItems.map((item: any) => <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setShowMobileNav(false); }}><item.icon size={17} /><span>{item.label}</span>{item.count && <em>{item.count}</em>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="trial-card"><div className="trial-kicker"><Sparkles size={13} /> Trial plan <span>4 days</span></div><strong>3 of 3 vehicles used</strong><div className="trial-progress"><span style={{ width: "100%" }} /></div><button onClick={() => toast.info("Billing workspace opened", { description: "Choose a paid vehicle tier to keep your fleet moving." })}>Review upgrade <SquareArrowOutUpRight size={13} /></button></div><button className="nav-item"><Settings2 size={17} /><span>Workspace settings</span></button><div className="user-chip"><div className="user-avatar">AS</div><div><strong>Arjun Shah</strong><span>Superadmin</span></div><MoreHorizontal size={16} /></div></div>
      </aside>

      <main className="main-canvas">
        <header className="topbar"><button className="mobile-menu" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumb"><span>Avani Transit</span><span>/</span><strong>{activeNav}</strong></div><div className="topbar-actions"><button className="command-button" onClick={() => toast.info("Command palette", { description: "Try searching vehicles, work orders, or team members." })}><Command size={15} /> <span>Quick find</span><kbd>⌘ K</kbd></button><button className="notification-button" onClick={() => { setNotifications(0); toast.info(liveNotifications?.length ? `${liveNotifications.filter((item: any) => !item.isRead).length} live notifications` : "No live notifications"); }} aria-label="Notifications"><Bell size={18} />{session ? liveNotifications?.filter((item: any) => !item.isRead).length ? <i>{liveNotifications.filter((item: any) => !item.isRead).length}</i> : null : notifications > 0 && <i>{notifications}</i>}</button><div className="role-select-wrap"><button className="role-select" onClick={() => setShowRoleMenu(!showRoleMenu)}><span className="role-dot" /><span>{role.short}</span><ChevronDown size={14} /></button>{showRoleMenu && <div className="role-menu">{roles.map((item: any) => <button key={item.name} onClick={() => chooseRole(item)}><item.icon size={15} /><span>{item.name}</span>{role.name === item.name && <Check size={14} />}</button>)}<button className="role-menu-auth" onClick={() => session ? void handleSignOut() : toast.info("Supabase Auth required", { description: "Sign in with your FleetOps Supabase account to sync this workspace." })}>{session ? "Sign out" : "Sign in to sync"}</button></div>}</div></div></header>

        <section className="page-content">
          <div className="hero-row"><div><div className="eyebrow"><span className="eyebrow-line" /> Monday, 18 August 2026</div><h1>Good morning, Arjun<span className="accent-dot">.</span></h1><p className="hero-copy">Your fleet is <strong>92% road-ready</strong>. Two actions are blocking tomorrow’s dispatch.</p></div><div className="hero-actions"><button className="secondary-button" onClick={() => toast.success("Report export queued", { description: "Your fleet health report will be ready shortly." })}><Download size={16} /> Export report</button><button className="primary-button" onClick={() => toast.info("New work order", { description: "Select a vehicle to start a maintenance request." })}><Plus size={17} /> New work order</button></div></div>

          <div className="insight-banner"><div className="insight-icon"><CircleAlert size={19} /></div><div><strong>{summaryError ? "Live data unavailable" : summaryLoading ? "Syncing fleet signal" : "Maintenance signal detected"}</strong><p>{summaryError ? "The command center is showing the last known workspace snapshot." : "MH 14 EF 1106 has crossed the tyre-life threshold. Assign a technician before the 06:00 school charter."}</p></div><button onClick={() => setActiveNav("Work orders")}>Review signal <ArrowUpRight size={15} /></button></div>
          {session && <div className="backend-status-line">{[vehiclesError, ordersError, inventoryError, notificationsError, activityError].some(Boolean) ? "Some live panels are showing the last known snapshot." : vehiclesLoading || ordersLoading || inventoryLoading || notificationsLoading || activityLoading ? "Syncing live fleet, work orders, inventory, notifications, and activity…" : `Live data connected · ${liveInventory?.length ?? 0} inventory parts · ${liveActivity?.length ?? 0} recent events`}</div>}

          <div className="metrics-grid"><Metric label="Fleet health" value="92 / 100" delta="4.8%" detail={session ? `${liveNotifications?.filter((notification: any) => !notification.isRead).length ?? 0} unread signals` : "vs. last week"} icon={Gauge} accent="orange" /><Metric label="Active vehicles" value={`${backendSummary?.vehicles.length ?? 21} / 24`} delta="2" detail={session ? "live from Supabase" : "back on road"} icon={Bus} accent="blue" /><Metric label="Open work orders" value={String(backendSummary?.openWorkOrders ?? 8)} delta="3 due" detail={session ? "live from Supabase" : "before tomorrow"} icon={Wrench} accent="orange" /><Metric label="Cost / km" value="₹18.42" delta="6.2%" detail="vs. last month" icon={IndianRupee} accent="green" /></div>

          <div className="workspace-grid"><section className="panel fleet-panel"><div className="panel-heading"><div><div className="panel-kicker">Live fleet register</div><h2>Vehicle health</h2></div><button className="text-button" onClick={() => setActiveNav("Vehicles")}>View all vehicles <ArrowUpRight size={15} /></button></div><div className="fleet-toolbar"><div className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search registration or route" /></div><div className="filter-tabs">{["All fleet", "On route", "At depot"].map((item: any) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "selected" : ""}>{item}</button>)}</div></div><div className="vehicle-list">{visibleVehicles.map((vehicle: any) => <button className="vehicle-row" key={vehicle.id} onClick={() => toast.info(vehicle.id, { description: vehicle.service })}><div className="vehicle-icon"><Bus size={18} /></div><div className="vehicle-info"><strong>{vehicle.id}</strong><span>{vehicle.name}</span></div><div className={`vehicle-status signal-chip ${vehicle.tone}`}><span className="status-dot" />{vehicle.status}<small>{vehicle.tone === "good" ? "ready" : vehicle.tone === "warn" ? "review" : "held"}</small></div><HealthRing value={vehicle.health} /><div className="vehicle-meta"><strong>{vehicle.odo}</strong><span>{vehicle.service}</span></div><ArrowUpRight size={16} className="row-arrow" /></button>)}</div></section>

          <aside className="decision-rail"><section className="panel readiness-panel"><div className="panel-heading compact"><div><div className="panel-kicker">Dispatch readiness</div><h2>Tomorrow, 06:00</h2></div><span className="live-pill"><span />Live</span></div><div className="readiness-score"><div className="big-score">21<span>/24</span></div><div><strong>vehicles ready</strong><p>3 need a decision before first pull-out.</p></div></div><div className="readiness-bar"><span style={{ width: "87.5%" }} /></div><div className="readiness-legend"><span><i className="dot-ready" /> Road-ready <b>21</b></span><span><i className="dot-warning" /> Attention <b>2</b></span><span><i className="dot-critical" /> Held <b>1</b></span></div></section><section className="panel spend-panel"><div className="panel-heading compact"><div><div className="panel-kicker">Operating spend</div><h2>₹4.82L <small>this month</small></h2></div><span className="trend-up"><TrendingUp size={14} /> 8.4%</span></div><div className="sparkline"><span style={{ height: "42%" }} /><span style={{ height: "58%" }} /><span style={{ height: "46%" }} /><span style={{ height: "70%" }} /><span style={{ height: "62%" }} /><span style={{ height: "82%" }} /><span style={{ height: "74%" }} /><span style={{ height: "92%" }} /><span style={{ height: "86%" }} /><span style={{ height: "100%" }} /></div><div className="spend-footer"><span>Aug 01</span><span>Aug 18</span></div></section></aside></div>

          <div className="lower-grid"><section className="panel orders-panel"><div className="panel-heading"><div><div className="panel-kicker">Action queue</div><h2>Work orders</h2></div><button className="text-button" onClick={() => setShowAllOrders(!showAllOrders)}>{showAllOrders ? "Show less" : "View all 8"} <ArrowUpRight size={15} /></button></div><div className="orders-table"><div className="table-head"><span>Order</span><span>Vehicle</span><span>Owner</span><span>Priority</span><span>Due</span><span /></div>{visibleOrders.map((order: any) => <div className="table-row" key={order.id}><div className="order-cell"><strong>{order.id}</strong><span>{order.title}</span></div><span className="vehicle-cell">{order.vehicle}</span><span className="owner-cell"><span className="mini-avatar">{order.owner.split(" ").map((part: any) => part[0]).join("")}</span>{order.owner}</span><span className={`priority signal-chip ${order.priority.toLowerCase()}`}><span className="status-dot" />{order.priority}</span><span className="due-cell"><Clock3 size={13} />{order.due}</span>{order.status !== "Completed" ? <button className="row-action" onClick={() => completeOrder(order.id)} aria-label={`Complete ${order.id}`}><Check size={15} /></button> : <span className="completed-check"><Check size={15} /></span>}</div>)}</div></section><section className="panel activity-panel"><div className="panel-heading"><div><div className="panel-kicker">Operations feed</div><h2>Recent activity <small>{session ? `${liveActivity?.length ?? 0} live` : ""}</small></h2></div><button className="icon-button" onClick={() => toast.info("Activity feed is up to date")}><MoreHorizontal size={18} /></button></div><div className="maintenance-strip"><img src="/manus-storage/fleetops-maintenance-detail_321c76ee.jpg" alt="Technician checking a bus brake assembly" /><div><strong>Workshop signal</strong><span>Brake and tyre inspections are the top two cost drivers this month.</span></div></div><div className="inventory-signal"><div><div className="panel-kicker">Inventory ledger</div><strong>{session ? "Live stock watch" : "Stock watch"}</strong></div><span className="signal-chip warn"><Package size={12} />{session ? `${liveInventory?.filter((part: any) => part.quantityOnHand <= part.minReorderLevel).length ?? 0} below reorder` : "3 below reorder"}</span></div>{session && <div className="inventory-state">{inventoryLoading ? "Loading inventory ledger…" : inventoryError ? "Inventory is temporarily unavailable." : liveInventory?.length ? liveInventory.slice(0, 3).map((part: any) => <span key={part.id}><strong>{part.name}</strong><small>{part.quantityOnHand} on hand · reorder at {part.minReorderLevel}</small></span>) : "No inventory parts have been added yet."}</div>}<div className="activity-list">{session && activityLoading ? <div className="empty-state">Loading recent operations…</div> : session && activityError ? <div className="empty-state">Activity is temporarily unavailable.</div> : session && liveActivity?.length ? liveActivity.slice(0, 3).map((event) => <div className="activity-item" key={event.id}><span className="activity-bubble orange"><Activity size={15} /></span><div><p><strong>{event.title}</strong></p><span>{event.detail} · {new Date(event.createdAt).toLocaleString()}</span></div></div>) : <><div className="activity-item"><span className="activity-bubble orange"><Wrench size={15} /></span><div><p><strong>Ramesh K.</strong> completed brake service on <strong>MH 12 AB 4821</strong>.</p><span>12 min ago · parts cost ₹4,200</span></div></div><div className="activity-item"><span className="activity-bubble blue"><Package size={15} /></span><div><p>Inventory low: <strong>15W40 Engine Oil</strong> fell below reorder level.</p><span>38 min ago · auto-draft PO created</span></div></div></>}</div></section></div>

          <footer className="page-footer"><span><span className="footer-pulse" /> {authLoading ? "Connecting Supabase Auth" : session ? "Supabase Auth + Realtime connected" : "Demo workspace · sign in to sync"}</span><span>Last sync 18 Aug 2026, 11:42 IST</span><span>© FleetOps / Avani Transit</span></footer>
        </section>
      </main>
    </div>
  );
}
