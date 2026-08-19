import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TRPCError } from "@trpc/server";
import { requireRole } from "./routers";

const routersSource = fs.readFileSync(path.resolve(import.meta.dirname, "routers.ts"), "utf8");

describe("Milestone 1 operational contracts", () => {
  it("keeps organization audit history Superadmin-only and filterable by governance dimensions", () => {
    expect(() => requireRole("SUPERADMIN", ["SUPERADMIN"])).not.toThrow();
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN"])).toThrowError(TRPCError);
    expect(() => requireRole("ACCOUNTANT", ["SUPERADMIN"])).toThrowError(TRPCError);
    for (const filter of ["actorId", "actorRole", "entityType", "action", "outcome", "dateFrom", "dateTo"]) expect(routersSource).toContain(filter);
    expect(routersSource).toContain('outcome: z.enum(["SUCCESS", "ERROR"])');
    expect(routersSource).toContain("orgId: ctx.fleetopsUser.orgId");
  });

  it("keeps driver issue triage inside management roles", () => {
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN", "FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("SUPERADMIN", ["SUPERADMIN", "FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("DRIVER", ["SUPERADMIN", "FLEET_MANAGER"])).toThrowError(TRPCError);
  });

  it("keeps inventory movement history available to inventory and maintenance operators", () => {
    for (const role of ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"]) {
      expect(() => requireRole(role, ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"])).not.toThrow();
    }
    expect(() => requireRole("DRIVER", ["SUPERADMIN", "INVENTORY_MANAGER", "MECHANIC", "TECHNICIAN"])).toThrowError(TRPCError);
  });

  it("keeps compliance documents more restricted than maintenance evidence", () => {
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN", "FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("MECHANIC", ["SUPERADMIN", "FLEET_MANAGER"])).toThrowError(TRPCError);
    expect(() => requireRole("MECHANIC", ["SUPERADMIN", "FLEET_MANAGER", "MECHANIC", "TECHNICIAN"])).not.toThrow();
  });

  it("defines a tenant-scoped unified triage queue with operational sources", () => {
    expect(routersSource).toContain("triage: router({");
    expect(routersSource).toContain("queue: fleetOpsProcedure.query");
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
    expect(routersSource).toContain("vehicleIssue.findMany");
    expect(routersSource).toContain("inventoryPart.findMany");
    expect(routersSource).toContain("actionable: true");
    expect(routersSource).toContain("triageState");
    expect(routersSource).toContain('state: z.enum(["ACKNOWLEDGED", "ASSIGNED", "DEFERRED", "RESOLVED"])');
    expect(routersSource).toContain("TRIAGE_STATE_CHANGED");
  });

  it("defines explicit work-order lifecycle states and guarded transitions", () => {
    for (const state of ["WAITING_FOR_PARTS", "READY_FOR_REVIEW", "REWORK", "CANCELLED"]) expect(routersSource).toContain(state);
    expect(routersSource).toContain("WORK_ORDER_STATUS_CHANGED");
    expect(routersSource).toContain("Cannot move work order from");
    expect(routersSource).toContain("updateChecklist: fleetOpsProcedure.input");
    expect(routersSource).toContain("approve: fleetOpsProcedure.input");
    expect(routersSource).toContain("WORK_ORDER_CHECKLIST_UPDATED");
    expect(routersSource).toContain("Complete every execution checklist item before approval");
    expect(routersSource).toContain("WORK_ORDER_READY_FOR_REVIEW");
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["MECHANIC", "TECHNICIAN"])');
  });

  it("defines tenant-scoped board and inventory movement procedures", () => {
    expect(routersSource).toContain("board: fleetOpsProcedure.query");
    expect(routersSource).toContain("receive: fleetOpsProcedure.input");
    expect(routersSource).toContain("issue: fleetOpsProcedure.input");
    expect(routersSource).toContain('movementType: \"RECEIPT\"');
    expect(routersSource).toContain("reservePart: fleetOpsProcedure.input");
    expect(routersSource).toContain("returnReservedPart: fleetOpsProcedure.input");
    expect(routersSource).toContain("INVENTORY_PART_RESERVED");
    expect(routersSource).toContain("INVENTORY_PART_RETURNED");
    expect(routersSource).toContain("Insufficient available stock after existing reservations");
    expect(routersSource).toContain('movementType: \"ISSUE\"');
    expect(routersSource).toContain("DOCUMENT_EXPORT_CSV");
    expect(routersSource).toContain("fleetops-compliance-");
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
  });

  it("defines the Driver daily readiness and safety disposition loop", () => {
    expect(routersSource).toContain("dailyHome: fleetOpsProcedure.query");
    expect(routersSource).toContain("unsafeDisposition: fleetOpsProcedure.input");
    expect(routersSource).toContain('readiness === "UNSAFE"');
    expect(routersSource).toContain("DRIVER_SAFETY_DISPOSITION");
    expect(routersSource).toContain("Driver marked vehicle unsafe");
    expect(routersSource).toContain("active: true");
  });
});
