import { describe, expect, it } from "vitest";
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
