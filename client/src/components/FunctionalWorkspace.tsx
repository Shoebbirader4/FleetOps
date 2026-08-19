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
  return <div className="functional-workspace"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to command center</button>{section === "Team" ? <TeamWorkspace enabled={session} /> : session && section === "Settings" ? <OrganizationSettingsWorkspace /> : session && section === "Command center" ? <OwnerWorkspace organizationName={organizationName} /> : session && section === "Fleet manager workspace" ? <FleetManagerWorkspace organizationName={organizationName} /> : session && section === "Inventory manager workspace" ? <InventoryManagerWorkspace organizationName={organizationName} /> : session && (section === "Mechanic workspace" || section === "Mechanic / Technician workspace") ? <MechanicWorkspace organizationName={organizationName} role="MECHANIC" /> : session && section === "Technician workspace" ? <MechanicWorkspace organizationName={organizationName} role="TECHNICIAN" /> : session && section === "Accountant ledger" ? <AccountantRoleWorkspace organizationName={organizationName}><AccountantWorkspace /></AccountantRoleWorkspace> : session && section === "Driver portal" ? <DriverWorkspace /> : <ResourceWorkspace section={section} />}</div>;
}
