import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Fleet Manager work-order workspace", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/components/workspaces/ResourceWorkspace.tsx"), "utf8");

  it("loads the Fleet Manager's organization roster instead of the Superadmin-only members query", () => {
    expect(source).toContain('const operationalRoster = trpc.team.operationalRoster.useQuery(undefined, { enabled: section === "Work orders"');
    expect(source).toContain('const members = trpc.team.members.useQuery(undefined, { enabled: section === "Billing" || section === "Vehicles"');
    expect(source).toContain('const workOrderAssignees = (operationalRoster.data?.members ?? []).filter');
  });

  it("requires a mechanic or technician before dispatching a work order", () => {
    expect(source).toContain('if (!workOrderVehicleId || !workOrderTitle.trim() || !workOrderAssigneeId) return;');
    expect(source).toContain('assignedMechanicId: workOrderAssigneeId');
    expect(source).toContain('Assign to mechanic');
  });

  it("offers an edit action for late mechanic assignment or reassignment", () => {
    expect(source).toContain("trpc.workOrders.update.useMutation");
    expect(source).toContain('aria-label={`Edit work order ${row.title}`}');
    expect(source).toContain('assignedMechanicId: editingWorkOrder.assignedMechanicId ?? null');
    expect(source).toContain("Save work-order changes");
  });
});
