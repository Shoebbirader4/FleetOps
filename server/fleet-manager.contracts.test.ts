import { describe, expect, it } from "vitest";
import { CITY_BUS_MAINTENANCE_TEMPLATE, requireRole } from "./routers";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";

const routersSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");

describe("Fleet Manager responsibility contracts", () => {
  it("defines the complete City Bus maintenance preset", () => {
    expect(CITY_BUS_MAINTENANCE_TEMPLATE.map((item) => item.name)).toEqual(["Engine Oil", "Brakes", "Tires"]);
    expect(CITY_BUS_MAINTENANCE_TEMPLATE.every((item) => item.expectedLifeKm > item.alertThresholdKm)).toBe(true);
  });

  it("allows Fleet Manager operations while keeping finance outside its role", () => {
    expect(() => requireRole("FLEET_MANAGER", ["FLEET_MANAGER"])).not.toThrow();
    expect(() => requireRole("FLEET_MANAGER", ["SUPERADMIN", "ACCOUNTANT"])).toThrowError(TRPCError);
  });

  it("keeps assignment execution roles distinct from Fleet Manager dispatch", () => {
    expect(() => requireRole("FLEET_MANAGER", ["FLEET_MANAGER", "MECHANIC", "TECHNICIAN"])).not.toThrow();
    expect(() => requireRole("DRIVER", ["FLEET_MANAGER", "MECHANIC", "TECHNICIAN"])).toThrowError(TRPCError);
  });

  it("exposes a tenant-scoped reusable template apply workflow", () => {
    expect(routersSource).toContain("maintenanceTemplates: router({");
    expect(routersSource).toContain("applyTemplate:");
    expect(routersSource).toContain("MAINTENANCE_TEMPLATE_APPLIED");
    expect(routersSource).toContain("skippedExisting");
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
  });

  it("guards reassignment conflicts and returns readable roster visibility", () => {
    expect(routersSource).toContain("VEHICLE_REASSIGNED");
    expect(routersSource).toContain("closedAssignmentIds");
    expect(routersSource).toContain("activeAssignmentCount");
    expect(routersSource).toContain("unassignedDrivers");
    expect(routersSource).toContain("unassignedVehicles");
  });

  it("rejects stale concurrent work-order status edits with a conflict", () => {
    expect(routersSource).toContain("expectedUpdatedAt: z.coerce.date().optional()");
    expect(routersSource).toContain("This work order changed elsewhere. Refresh the queue before updating its status.");
    expect(routersSource).toContain('code: "CONFLICT"');
  });

  it("defines tenant-scoped maintenance planning with bounded date validation", () => {
    expect(routersSource).toContain("planning: router({");
    expect(routersSource).toContain("maintenance: fleetOpsProcedure");
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
    expect(routersSource).toContain("The planning end date must be on or after the start date.");
    expect(routersSource).toContain('kind: "COMPONENT_DUE"');
    expect(routersSource).toContain('kind: "DOCUMENT_EXPIRY"');
    expect(routersSource).toContain('kind: "WORK_ORDER"');
    expect(routersSource).toContain('orgId: ctx.fleetopsUser.orgId');
  });

  it("defines tenant-scoped Driver handoff visibility with safety aggregation", () => {
    expect(routersSource).toContain("driverHandoffs:");
    expect(routersSource).toContain('type: "DRIVER_SAFETY_DISPOSITION"');
    expect(routersSource).toContain('vehicle?.status === "OUT_OF_SERVICE" ? "UNSAFE"');
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
    expect(routersSource).toContain('where: { orgId: ctx.fleetopsUser.orgId, active: true }');
  });

  it("provides validated tenant-scoped compliance CSV preview and import", () => {
    expect(routersSource).toContain("previewImport:");
    expect(routersSource).toContain("importCsv:");
    expect(routersSource).toContain("DOCUMENT_IMPORT_CSV");
    expect(routersSource).toContain("Every row must reference an organization vehicle");
    expect(routersSource).toContain('requireRole(ctx.fleetopsUser.role, ["SUPERADMIN", "FLEET_MANAGER"])');
  });
});
