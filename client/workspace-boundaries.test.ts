import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canAccessWorkspace, dedicatedWorkspaceByRole, getAllowedWorkspace, roleNavAccess } from "./src/workspaceAccess";

describe("role workspace boundaries", () => {
  it("routes every supported role to one dedicated workspace", () => {
    expect(dedicatedWorkspaceByRole).toEqual({
      SUPERADMIN: "Command center",
      FLEET_MANAGER: "Fleet manager workspace",
      INVENTORY_MANAGER: "Inventory manager workspace",
      MECHANIC: "Mechanic workspace",
      TECHNICIAN: "Technician workspace",
      DRIVER: "Driver portal",
      ACCOUNTANT: "Accountant ledger",
    });
  });

  it("keeps specialist workspaces unavailable to Superadmin navigation", () => {
    expect(canAccessWorkspace("SUPERADMIN", "Command center")).toBe(true);
    expect(canAccessWorkspace("SUPERADMIN", "Fleet manager workspace")).toBe(false);
    expect(canAccessWorkspace("SUPERADMIN", "Inventory manager workspace")).toBe(false);
    expect(canAccessWorkspace("SUPERADMIN", "Driver portal")).toBe(false);
    expect(canAccessWorkspace("SUPERADMIN", "Accountant ledger")).toBe(false);
  });

  it("keeps each member limited to their own workspace and notifications", () => {
    for (const [role, workspace] of Object.entries(dedicatedWorkspaceByRole)) {
      if (role === "SUPERADMIN") continue;
      expect(roleNavAccess[role]).toEqual([workspace, "Notifications"]);
      expect(getAllowedWorkspace(role, "Command center")).toBe(workspace);
      expect(getAllowedWorkspace(role, "Billing")).toBe(workspace);
    }
  });

  it("removes static tenant labels and unauthorized owner actions from the authenticated shell", () => {
    const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const teamSource = readFileSync(resolve(process.cwd(), "client/src/components/workspaces/TeamWorkspace.tsx"), "utf8");
    expect(homeSource).not.toContain("Avani Transit");
    expect(homeSource).not.toContain('onClick={() => setActiveNav("Work orders")}>New work order');
    expect(teamSource).toContain('team.members.useQuery(undefined, { enabled, retry: false })');
    expect(teamSource).toContain('team.invitations.useQuery(undefined, { enabled, retry: false })');
  });

  it("exposes the persisted Fleet register create flow without widening role navigation", () => {
    const resourceSource = readFileSync(resolve(process.cwd(), "client/src/components/workspaces/ResourceWorkspace.tsx"), "utf8");
    const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    expect(resourceSource).toContain("trpc.vehicles.create.useMutation");
    expect(resourceSource).toContain("Maintenance template");
    expect(resourceSource).toContain("utils.vehicles.list.invalidate()");
    expect(routerSource).toContain("create: fleetOpsProcedure.input(z.object({ vin:");
    expect(routerSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
  });

  it("allows only the matching named specialist route", () => {
    expect(canAccessWorkspace("FLEET_MANAGER", "Fleet manager workspace")).toBe(true);
    expect(canAccessWorkspace("INVENTORY_MANAGER", "Inventory manager workspace")).toBe(true);
    expect(canAccessWorkspace("MECHANIC", "Mechanic workspace")).toBe(true);
    expect(canAccessWorkspace("TECHNICIAN", "Technician workspace")).toBe(true);
    expect(canAccessWorkspace("DRIVER", "Driver portal")).toBe(true);
    expect(canAccessWorkspace("ACCOUNTANT", "Accountant ledger")).toBe(true);
    expect(canAccessWorkspace("DRIVER", "Fleet manager workspace")).toBe(false);
    expect(canAccessWorkspace("ACCOUNTANT", "Inventory manager workspace")).toBe(false);
  });
});
