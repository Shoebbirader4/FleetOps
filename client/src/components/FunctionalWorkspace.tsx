import { useEffect, useState } from "react";
import { ArrowLeft, Check, Download, Gauge, Mail, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TeamWorkspace } from "@/components/workspaces/TeamWorkspace";
import { NotificationWorkspace } from "@/components/workspaces/NotificationWorkspace";
import { WorkspaceState as State } from "@/components/workspaces/WorkspaceState";
import type { DocumentRow, FinancialMetricRow, FinancialRecord, FinancialReconciliationRow, FleetVehicle, ProcurementOrderRow, WorkOrderRow } from "@/types/fleet";
import { AccountantRoleWorkspace, FleetManagerWorkspace, InventoryManagerWorkspace, MechanicWorkspace, OwnerWorkspace } from "@/components/RoleWorkspaces";
import { DriverWorkspace } from "@/components/workspaces/DriverWorkspace";
import { ProcurementWorkspace } from "@/components/workspaces/ProcurementWorkspace";
import { ComplianceWorkspace } from "@/components/workspaces/ComplianceWorkspace";
import { AccountantWorkspace } from "@/components/workspaces/AccountantWorkspace";
import { OrganizationSettingsWorkspace } from "@/components/workspaces/OrganizationSettingsWorkspace";
import { ResourceWorkspace } from "@/components/workspaces/ResourceWorkspace";
import { RoleOverviewWorkspace } from "@/components/workspaces/RoleOverviewWorkspace";

type Props = { section: string; session: boolean; onBack: () => void; organizationName?: string };
type GenericResourceRow = { id: string; [key: string]: unknown };

function downloadCsv(filename: string, content: string) { const blob = new Blob([content], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
function downloadPdf(filename: string, base64: string) { const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); const blob = new Blob([bytes], { type: "application/pdf" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }


export default function FunctionalWorkspace({ section, session, onBack, organizationName }: Props) {
  if (!session) return <section className="panel auth-gate"><Mail size={24} /><h2>Sign in to open {section}</h2><p>This workspace is connected to Supabase and does not show demo records while signed out.</p><button className="primary-button" onClick={() => toast.info("Use your Supabase Auth sign-in flow to continue.")}><Plus size={16} /> Sign in to sync</button></section>;
  const fleetManagerPage = section === "Fleet manager workspace" ? { label: "Fleet readiness", title: "Operate the connected fleet", description: "Vehicles, components, work orders, driver handoffs, and compliance signals stay linked to the same organization." } : section === "Vehicles" ? { label: "Asset register", title: "Vehicles", description: "Create, assign, edit, and monitor every vehicle before maintenance signals become breakdowns." } : section === "Components" ? { label: "Maintenance signals", title: "Components", description: "Install service components with odometer thresholds so the next work order starts with evidence." } : section === "Work orders" ? { label: "Dispatch control", title: "Work orders", description: "Turn vehicle signals and driver reports into assigned, traceable maintenance handoffs." } : section === "Compliance vault" ? { label: "Readiness records", title: "Compliance vault", description: "Keep vehicle and driver documents visible, dated, and ready for renewal before they expire." } : null;
  const content = section === "Team" ? <TeamWorkspace enabled={session} /> : session && section === "Settings" ? <OrganizationSettingsWorkspace /> : session && section === "Command center" ? <OwnerWorkspace organizationName={organizationName} /> : session && section === "Fleet manager workspace" ? <FleetManagerWorkspace organizationName={organizationName} /> : session && section === "Inventory manager workspace" ? <InventoryManagerWorkspace organizationName={organizationName} /> : session && (section === "Mechanic workspace" || section === "Mechanic / Technician workspace") ? <MechanicWorkspace organizationName={organizationName} role="MECHANIC" /> : session && section === "Technician workspace" ? <MechanicWorkspace organizationName={organizationName} role="TECHNICIAN" /> : session && section === "Accountant ledger" ? <AccountantRoleWorkspace organizationName={organizationName}><AccountantWorkspace /></AccountantRoleWorkspace> : session && section === "Driver portal" ? <DriverWorkspace /> : <ResourceWorkspace section={section} />;
  return <div className={`functional-workspace${fleetManagerPage ? " fleet-manager-surface" : ""}`}><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to command center</button>{fleetManagerPage && <header className="workspace-page-header"><div><div className="panel-kicker">{fleetManagerPage.label} · Fleet Manager</div><h1>{fleetManagerPage.title}<span className="accent-dot">.</span></h1><p>{fleetManagerPage.description}</p></div><div className="workspace-chain"><span className="chain-node active">01</span><span>Fleet register</span><i /> <span className="chain-node">02</span><span>Maintenance</span><i /> <span className="chain-node">03</span><span>Dispatch</span></div></header>}{content}</div>;
}
