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
});
